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

/** State used for all encryption functions, wrapped into a single class. */
export class EncryptionState {
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
 */
export function encryptBallot(
  state: EncryptionState,
  ballot: PlaintextBallot,
  primaryNonce: ElementModQ
): CiphertextBallot {
  const ballotNonce: ElementModQ = hashElements(
    state.group,
    state.manifestHash,
    ballot.ballotId,
    primaryNonce
  );

  const pcontests = associateBy(ballot.contests, c => c.contestId);

  const encryptedContests = state.manifest.contests.map(mcontest => {
    const pcontest: PlaintextContest =
      pcontests.get(mcontest.contestId) ?? contestFrom(mcontest);
    // If no contest on the ballot, so create a placeholder
    return encryptContest(
      state,
      pcontest,
      ballot.ballotId,
      mcontest,
      ballotNonce
    );
  });

  const cryptoHash = hashElements(
    state.group,
    ballot.ballotId,
    state.manifestHash,
    encryptedContests
  );

  // Ticks are defined here as number of seconds since the unix epoch (00:00:00 UTC on 1
  // January 1970)
  const timestamp: number = Date.now() / 1000;
  const ballotCode = hashElements(
    state.group,
    state.group.ZERO_MOD_Q, // tracking hash of prior ballot
    timestamp,
    cryptoHash
  );

  const encryptedBallot = new CiphertextBallot(
    ballot.ballotId,
    ballot.ballotStyleId,
    state.manifestHash,
    state.group.ZERO_MOD_Q, // tracking hash of prior ballot
    ballotCode,
    encryptedContests,
    timestamp,
    cryptoHash,
    primaryNonce
  );
  return encryptedBallot;
}

function contestFrom(mcontest: ManifestContestDescription): PlaintextContest {
  const selections = mcontest.selections.map(it =>
    selectionFrom(it.selectionId, it.sequenceOrder, false, false)
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
 */
export function encryptContest(
  state: EncryptionState,
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
        selectionFrom(
          mselection.selectionId,
          mselection.sequenceOrder,
          false,
          false
        );
      // If no selection was made for this possible value, we explicitly set it to false

      // track the selection count so we can append the appropriate number of true placeholder
      // votes
      selectionCount += plaintextSelection.vote;
      return encryptSelection(
        state,
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

  const encryptedPlaceholders = numberRange(1, limit).map(placeholderNumber => {
    const sequenceNo =
      selectionSequenceOrderMax.sequenceOrder + placeholderNumber;
    const plaintextSelection = selectionFrom(
      `${contestDescription.contestId}-$sequenceNo`,
      sequenceNo,
      true,
      selectionCount < limit
    );
    selectionCount++;

    const mselection = generatePlaceholderSelectionFrom(
      state,
      contestDescription,
      sequenceNo
    );

    return encryptSelection(
      state,
      plaintextSelection,
      mselection.cryptoHashElement,
      contestNonce,
      true
    );
  });

  const encryptedSelections = encryptedNormalSelections.concat(
    encryptedPlaceholders
  );

  const cryptoHash = hashElements(
    state.group,
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
      state.publicKey,
      chaumPedersenNonce,
      state.extendedBaseHash
    );

  if (
    state.validate &&
    !proof.isValid(
      ciphertextAccumulation,
      state.publicKey,
      state.extendedBaseHash,
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

function selectionFrom(
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
function generatePlaceholderSelectionFrom(
  state: EncryptionState,
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
    state.group,
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
export function encryptSelection(
  state: EncryptionState,
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
    state.publicKey,
    plaintextSelection.vote,
    selectionNonce
  );

  const proof = DisjunctiveChaumPedersenProofKnownNonce.create(
    elGamalEncryption,
    plaintextSelection.vote,
    selectionNonce,
    state.publicKey,
    disjunctiveChaumPedersenNonce,
    state.extendedBaseHash
  );

  if (
    state.validate &&
    !proof.isValid(elGamalEncryption, state.publicKey, state.extendedBaseHash)
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
    state.group,
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
