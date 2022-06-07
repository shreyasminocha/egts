import {
  ConstantChaumPedersenProofKnownNonce,
  DisjunctiveChaumPedersenProofKnownNonce,
} from '../core/chaum-pedersen';
import {ElectionContext} from '../core/constants';
import {elGamalAdd, elGamalEncrypt, ElGamalPublicKey} from '../core/elgamal';
import {addQ, ElementModQ, GroupContext} from '../core/group-common';
import {hashElements} from '../core/hash';
import {Nonces} from '../core/nonces';
import {associateBy, maxOf, numberRange} from '../core/utils';
import {
  CiphertextBallot,
  CiphertextContest,
  CiphertextSelection,
} from './ciphertext-ballot';
import {
  Manifest,
  ManifestContestDescription,
  ManifestSelectionDescription,
} from './manifest';
import {
  PlaintextBallot,
  PlaintextContest,
  PlaintextSelection,
} from './plaintext-ballot';

/**
 * Encrypt Plaintext Ballots into Ciphertext Ballots. The input Ballots must be well-formed and
 * consistent. See RunBatchEncryption and BallotInputValidation to validate ballots before passing
 * them to this class.
 */
export class Encryptor {
  publicKey: ElGamalPublicKey;
  extendedBaseHash: ElementModQ;
  manifestHash: ElementModQ;
  constructor(
    readonly group: GroupContext,
    readonly manifest: Manifest,
    readonly context: ElectionContext,
    readonly validate: boolean
  ) {
    this.publicKey = new ElGamalPublicKey(context.jointPublicKey);
    this.extendedBaseHash = context.cryptoExtendedBaseHash;
    this.manifestHash = manifest.cryptoHashElement;
  }

  encryptBallotList(
    ballots: Array<PlaintextBallot>,
    encryptionSeed: ElementModQ
  ): Array<CiphertextBallot> {
    let previousTrackingHash = encryptionSeed;
    const encryptedBallots = ballots.map(ballot => {
      const encryptedBallot = this.encryptBallot(
        ballot,
        previousTrackingHash,
        this.group.randQ()
      );

      // Yes, we're doing side-effects inside the lambda of a map function.
      // Yes, this is awful.

      // But it does work nicely.

      previousTrackingHash = encryptedBallot.code;
      return encryptedBallot;
    });

    return encryptedBallots;
  }

  /**
   * Encrypt a PlaintextBallot into a CiphertextBallot.
   *
   * This method accepts a ballot representation that only includes `true` selections. It will
   * fill missing selections for a contest with `false` values, and generate `placeholder`
   * selections to represent the number of seats available for a given contest.
   *
   * This method also allows for ballots to exclude passing contests for which the voter made no
   * selections. It will fill missing contests with `false` selections and generate `placeholder`
   * selections that are marked `true`.
   *
   * @param encryptionSeed: Hash from previous ballot or starting hash from device. python:
   *     seed_hash
   * @param randomMasterNonce: the nonce used to encrypt this contest
   */
  encryptBallot(
    ballot: PlaintextBallot,
    encryptionSeed: ElementModQ,
    randomMasterNonce: ElementModQ
  ): CiphertextBallot {
    // python nonce_seed
    const ballotNonce: ElementModQ = hashElements(
      this.group,
      this.manifestHash,
      ballot.ballotId,
      randomMasterNonce
    );

    const pcontests = associateBy(ballot.contests, c => c.contestId);

    const encryptedContests: Array<CiphertextContest> = [];

    this.manifest.contests.forEach(mcontest => {
      const pcontest: PlaintextContest =
        pcontests.get(mcontest.contestId) ?? this.contestFrom(mcontest);
      // If no contest on the ballot, so create a placeholder
      encryptedContests.push(
        this.encryptContest(pcontest, ballot.ballotId, mcontest, ballotNonce)
      );
    });

    // Ticks are defined here as number of seconds since the unix epoch (00:00:00 UTC on 1
    // January 1970)
    const timestamp: number = Date.now() / 1000;
    const cryptoHash = hashElements(
      this.group,
      ballot.ballotId,
      this.manifestHash,
      encryptedContests
    );
    const ballotCode = hashElements(
      this.group,
      encryptionSeed,
      timestamp,
      cryptoHash
    );

    const encryptedBallot = new CiphertextBallot(
      ballot.ballotId,
      ballot.ballotStyleId,
      this.manifestHash,
      encryptionSeed,
      ballotCode,
      encryptedContests,
      timestamp,
      cryptoHash,
      randomMasterNonce
    );
    return encryptedBallot;
  }

  private contestFrom(mcontest: ManifestContestDescription): PlaintextContest {
    const selections = mcontest.selections.map(it =>
      this.selectionFrom(it.selectionId, it.sequenceOrder, false, false)
    );
    return new PlaintextContest(
      mcontest.contestId,
      mcontest.sequenceOrder,
      selections
    );
  }

  /**
   * Encrypt a PlaintextContest into CiphertextContest.
   *
   * It will fill missing selections for a contest with `false` values, and generate `placeholder`
   * selections to represent the number of seats available for a given contest. By adding
   * `placeholder` votes
   *
   * @param contestDescription: the corresponding ManifestContestDescription
   * @param ballotNonce: the seed for this contest
   */
  encryptContest(
    contest: PlaintextContest,
    ballotId: String,
    contestDescription: ManifestContestDescription,
    ballotNonce: ElementModQ
  ): CiphertextContest {
    const contestDescriptionHash = contestDescription.cryptoHashElement;
    const nonceSequence = new Nonces(contestDescriptionHash, ballotNonce);

    // NOTE: This could be simplified to get rid of the sequenceOrder part,
    // which is cryptographically meaningless here, since it's subsumed
    // into the contestDescriptionHash, but we're trying to be bug-for-bug
    // compatible with the Python code, so here we go.
    const contestNonce = nonceSequence.get(contestDescription.sequenceOrder);
    const chaumPedersenNonce = nonceSequence.get(0);

    const plaintextSelections = associateBy(
      contest.selections,
      s => s.selectionId
    );

    let selectionCount = 0;

    const encryptedNormalSelections = contestDescription.selections.map(
      mselection => {
        // Find the actual selection matching the contest description.
        const plaintextSelection =
          plaintextSelections.get(mselection.selectionId) ??
          this.selectionFrom(
            mselection.selectionId,
            mselection.sequenceOrder,
            false,
            false
          );
        // If no selection was made for this possible value, we explicitly set it to false

        // track the selection count so we can append the appropriate number of true placeholder
        // votes
        selectionCount += plaintextSelection.vote;
        return this.encryptSelection(
          plaintextSelection,
          mselection.cryptoHashElement,
          contestNonce,
          false
        );
      }
    );

    // Handle undervotes. LOOK what about overvotes?
    // Add a placeholder selection for each possible seat in the contest
    const limit = contestDescription.votesAllowed;
    const selectionSequenceOrderMax = maxOf(
      contestDescription.selections,
      it => it.sequenceOrder
    );

    const encryptedPlaceholders = numberRange(1, limit).map(
      placeholderNumber => {
        const sequenceNo =
          selectionSequenceOrderMax.sequenceOrder + placeholderNumber;
        const plaintextSelection = this.selectionFrom(
          `${contestDescription.contestId}-$sequenceNo`,
          sequenceNo,
          true,
          selectionCount < limit
        );
        selectionCount++;

        const mselection = this.generatePlaceholderSelectionFrom(
          contestDescription,
          sequenceNo
        );

        return this.encryptSelection(
          plaintextSelection,
          mselection.cryptoHashElement,
          contestNonce,
          true
        );
      }
    );

    const encryptedSelections = encryptedNormalSelections.concat(
      encryptedPlaceholders
    );

    const cryptoHash = hashElements(
      this.group,
      contest.contestId,
      contestDescriptionHash,
      encryptedSelections
    );

    const texts = encryptedSelections.map(it => it.ciphertext);
    const ciphertextAccumulation = elGamalAdd(...texts);
    const nonces = encryptedSelections.map(it => it.selectionNonce);
    const aggNonce = addQ(...nonces);

    const proof: ConstantChaumPedersenProofKnownNonce =
      ConstantChaumPedersenProofKnownNonce.create(
        ciphertextAccumulation,
        limit,
        aggNonce,
        this.publicKey,
        chaumPedersenNonce,
        this.extendedBaseHash
      );

    if (
      this.validate &&
      !proof.isValid(
        ciphertextAccumulation,
        this.publicKey,
        this.extendedBaseHash,
        limit
      )
    ) {
      console.warn(
        `Ballot ${ballotId} contest ${contest.contestId} proof does not validate`
      );
    }

    const encryptedContest = new CiphertextContest(
      contest.contestId,
      contest.sequenceOrder,
      contestDescription.cryptoHashElement,
      encryptedSelections,
      ciphertextAccumulation,
      cryptoHash,
      proof,
      contestNonce
    );

    return encryptedContest;
  }

  private selectionFrom(
    selectionId: string,
    sequenceOrder: number,
    isPlaceholder: boolean,
    isAffirmative: boolean
  ): PlaintextSelection {
    return new PlaintextSelection(
      selectionId,
      sequenceOrder,
      isAffirmative ? 1 : 0,
      isPlaceholder,
      undefined // no extended data
    );
  }

  /** Generates a placeholder selection description that is unique so it can be hashed. */
  private generatePlaceholderSelectionFrom(
    contest: ManifestContestDescription,
    sequenceId: number
  ): ManifestSelectionDescription {
    const sequenceOrdinals = contest.selections.map(s => s.sequenceOrder);

    if (!sequenceOrdinals.includes(sequenceId)) {
      throw new Error(
        `mismatched placeholder selection ${sequenceId} already exists for contest`
      );
    }

    const placeholderObjectId = `${contest.objectId}-${sequenceId}`;
    return new ManifestSelectionDescription(
      this.group,
      `${placeholderObjectId}-placeholder`,
      sequenceId,
      `${placeholderObjectId}-candidate`
    );
  }

  /**
   * Encrypt a PlaintextSelection into a CiphertextSelection
   *
   * @param selectionDescription: the Manifest selection
   * @param contestNonce: aka "nonce seed"
   * @param isPlaceholder: if this is a placeholder selection
   */
  encryptSelection(
    plaintextSelection: PlaintextSelection,
    manifestSelectionHash: ElementModQ,
    contestNonce: ElementModQ,
    isPlaceholder = false
  ): CiphertextSelection {
    // See "NOTE" in encryptContest. Same issue applies here.

    const nonceSequence = new Nonces(manifestSelectionHash, contestNonce);

    const disjunctiveChaumPedersenNonce: ElementModQ = nonceSequence.get(0);
    const selectionNonce: ElementModQ = nonceSequence.get(
      plaintextSelection.sequenceOrder
    );

    // Generate the encryption
    const elGamalEncryption = elGamalEncrypt(
      this.publicKey,
      plaintextSelection.vote,
      selectionNonce
    );

    const proof = DisjunctiveChaumPedersenProofKnownNonce.create(
      elGamalEncryption,
      plaintextSelection.vote,
      selectionNonce,
      this.publicKey,
      disjunctiveChaumPedersenNonce,
      this.extendedBaseHash
    );

    if (
      this.validate &&
      !proof.isValid(elGamalEncryption, this.publicKey, this.extendedBaseHash)
    ) {
      console.warn(
        `Selection ${plaintextSelection.selectionId} proof does not validate`
      );
    }

    if (plaintextSelection.extendedData !== undefined) {
      throw new Error(
        'encrypting selections with extended data not supported yet'
      );
    }

    const cryptoHash = hashElements(
      this.group,
      plaintextSelection.selectionId,
      manifestSelectionHash,
      elGamalEncryption.cryptoHashElement
    );

    const encryptedSelection: CiphertextSelection = new CiphertextSelection(
      plaintextSelection.selectionId,
      plaintextSelection.sequenceOrder,
      manifestSelectionHash,
      elGamalEncryption,
      cryptoHash,
      isPlaceholder,
      proof,
      selectionNonce,
      undefined // no extended data (yet!)
    );
    return encryptedSelection;
  }
}
