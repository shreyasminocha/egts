import {ElectionContext} from '../core/constants';
import {ElementModQ} from '../core/group-common';
import {hashElements} from '../core/hash';
import {mapFrom, stringSetsEqual} from '../core/utils';
import {CiphertextBallot, CiphertextContest} from './ciphertext-ballot';
import {sortedArrayOfOrderedElectionObjects} from './election-object-base';
import {encryptContest, EncryptionState} from './encrypt';
import {Manifest, ManifestContestDescription} from './manifest';
import {PlaintextContest} from './plaintext-ballot';

/**
 * This class wraps all the state and machinery necessary to offload encryption
 * computations on a contest-by-contest basis. The idea is that you initialize
 * it with all the state it will ever need as well as specifying the particular
 * ballot style. Then, you can call encrypt(), which will immediately
 * return while running the computation in a webworker or equivalent.
 *
 * If you encrypt the same contest twice, the latter one will replace the
 * earlier one.
 *
 * When you're done, you call getEncryptedBallot(), which will block until
 * all the contest encryption is complete, and will then return the encrypted
 * ballot. This call has the potential to fail, for example, if you haven't
 * encrypted all the necessary contests for the given ballot style.
 */
export class WorkerPoolEncryption {
  readonly encryptionState: EncryptionState;
  readonly manifestContests: Map<string, ManifestContestDescription>;
  readonly sequenceOrder: Map<string, number>;
  readonly contestIds: string[];
  readonly encryptedContests: Map<string, Promise<CiphertextContest>>;
  readonly primaryNonce: ElementModQ;

  constructor(
    manifest: Manifest,
    context: ElectionContext,
    validate: boolean,
    readonly masterNonce: ElementModQ,
    readonly ballotStyleId: string,
    readonly ballotId: string
  ) {
    this.encryptionState = new EncryptionState(
      masterNonce.context,
      manifest,
      context,
      validate
    );

    // This copies some code in encryptBallot(); the ballotNonce is
    // hashed deeper as we go.
    this.primaryNonce = hashElements(
      masterNonce.context,
      this.encryptionState.manifestHash,
      ballotId,
      masterNonce
    );

    const manifestContestDescriptions = manifest.getContests(ballotStyleId);

    this.contestIds = manifestContestDescriptions.map(mcd => mcd.contestId);

    this.manifestContests = mapFrom(
      manifestContestDescriptions,
      mcd => mcd.contestId,
      mcd => mcd
    );

    this.sequenceOrder = mapFrom(
      manifestContestDescriptions,
      mcd => mcd.contestId,
      mcd => mcd.sequenceOrder
    );
    this.encryptedContests = new Map(); // to be filled in later
  }

  /** Starts an async encryption of the contest. Returns immediately. */
  encrypt(contest: PlaintextContest): void {
    const sequenceOrder = this.sequenceOrder.get(contest.contestId);
    const manifestContestDesc = this.manifestContests.get(contest.contestId);

    if (manifestContestDesc === undefined || sequenceOrder === undefined) {
      throw new Error(
        `unexpected absence of a ManifestContestDescription for ${contest.contestId}`
      );
    }

    this.encryptedContests.set(
      contest.contestId,
      this.encryptHelper(contest, sequenceOrder, manifestContestDesc)
    );
  }

  // TODO: replace this async stuff with calls out to workerpool
  private async encryptHelper(
    contest: PlaintextContest,
    sequenceOrder: number,
    manifestContestDesc: ManifestContestDescription
  ): Promise<CiphertextContest> {
    return encryptContest(
      this.encryptionState,
      contest,
      this.ballotId,
      manifestContestDesc,
      this.primaryNonce
    );
  }

  /**
   * Fetches the encrypted ballot, possibly blocking until all the async
   * computation is complete. If a contest wasn't submitted, then it's
   * not possible to derive the result, so undefined is returned.
   */
  async getEncryptedBallot(): Promise<CiphertextBallot | undefined> {
    if (
      !stringSetsEqual(
        Array.from(this.encryptedContests.keys()),
        this.contestIds
      )
    ) {
      console.error(
        `missing contests: only ${this.encryptedContests.size} of ${this.contestIds.length} present`
      );
      return undefined;
    }

    // If we get here, we've got all the promises we're going to need,
    // so now we just have to make sure they're all done.

    const promisedResults = Promise.all(this.encryptedContests.values()).catch(
      e => {
        // hopefully, if something goes wrong, this will notice it and log something
        console.error(`promise failure? ${e}`);
        return undefined;
      }
    );

    const unsortedEncryptedContests = await promisedResults;
    if (unsortedEncryptedContests === undefined) {
      return undefined;
    }

    const encryptedContests = sortedArrayOfOrderedElectionObjects(
      unsortedEncryptedContests
    );

    const cryptoHash = hashElements(
      this.encryptionState.group,
      this.ballotId,
      this.encryptionState.manifestHash,
      encryptedContests
    );

    // Ticks are defined here as number of seconds since the unix epoch (00:00:00 UTC on 1
    // January 1970)
    const timestamp: number = Date.now() / 1000;
    const ballotCode = hashElements(
      this.encryptionState.group,
      this.encryptionState.group.ZERO_MOD_Q, // tracking hash of prior ballot
      timestamp,
      cryptoHash
    );

    const encryptedBallot = new CiphertextBallot(
      this.ballotId,
      this.ballotStyleId,
      this.encryptionState.manifestHash,
      this.encryptionState.group.ZERO_MOD_Q, // tracking hash of prior ballot
      ballotCode,
      encryptedContests,
      timestamp,
      cryptoHash,
      this.primaryNonce
    );

    return encryptedBallot;
  }
}
