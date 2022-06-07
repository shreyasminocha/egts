import {elGamalAdd, ElGamalCiphertext} from '../core/elgamal';
import {ElementModQ} from '../core/group-common';
import {getOrFail, mapFrom} from '../core/utils';
import {
  SubmittedBallot,
  SubmittedContest,
  SubmittedSelection,
} from './submitted-ballot';

/** The encrypted representation of the summed votes for a collection of ballots */
export class CiphertextTally {
  constructor(
    readonly contests: Map<string, CiphertextTallyContest> // map<contestId, contest>
  ) {}

  static createFromBallots(ballots: Array<SubmittedBallot>): CiphertextTally {
    if (ballots.length === 0) {
      throw new Error('cannot tally zero ballots');
    }
    const subTallies = ballots.map(b => CiphertextTally.createFromBallot(b));
    return subTallies
      .slice(1)
      .reduce((prev, next) => prev.accumulate(next), subTallies[0]);
  }

  static createFromBallot(ballot: SubmittedBallot): CiphertextTally {
    const contests = ballot.contests.map(c => CiphertextTallyContest.create(c));
    return new CiphertextTally(
      mapFrom(
        contests,
        c => c.contestId,
        c => c
      )
    );
  }

  accumulate(tally: CiphertextTally): CiphertextTally {
    // there may be contests that aren't shared by both tallies
    // so we have to be a little careful here.
    const allContestKeys = Array.from(
      new Set([...this.contests.keys(), ...tally.contests.keys()]).keys()
    );

    return new CiphertextTally(
      mapFrom(
        allContestKeys,
        c => c,
        c => {
          if (this.contests.has(c)) {
            if (tally.contests.has(c)) {
              return getOrFail(this.contests, c).accumulate(
                getOrFail(tally.contests, c)
              );
            } else {
              return getOrFail(this.contests, c);
            }
          } else {
            return getOrFail(tally.contests, c);
          }
        }
      )
    );
  }
}
/**
 * The encrypted selections for a specific contest. The contestId is the
 * Manifest.ContestDescription.contestId.
 */
export class CiphertextTallyContest {
  constructor(
    readonly contestId: string,
    readonly sequenceOrder: number,
    readonly contestDescriptionHash: ElementModQ, // matches ContestDescription.cryptoHash
    readonly selections: Map<string, CiphertextTallySelection> // map<selectionId, selection>
  ) {}

  /**
   * Creates a new tally contest from a single contest.
   * You would then call accumulate() on this with subsequent
   * contests.
   */
  static create(contest: SubmittedContest): CiphertextTallyContest {
    return new CiphertextTallyContest(
      contest.contestId,
      contest.sequenceOrder,
      contest.contestHash,
      mapFrom(
        contest.selections,
        s => s.selectionId,
        s => CiphertextTallySelection.create(s)
      )
    );
  }

  accumulate(contest: CiphertextTallyContest): CiphertextTallyContest {
    if (
      contest.contestId === this.contestId &&
      contest.sequenceOrder === this.sequenceOrder &&
      contest.contestDescriptionHash.equals(this.contestDescriptionHash)
    ) {
      const keys: Array<string> = Array.from(contest.selections.keys(), x => x);
      const newMap = mapFrom(
        keys,
        s => s,
        s =>
          getOrFail(contest.selections, s).accumulate(
            getOrFail(this.selections, s)
          )
      );

      return new CiphertextTallyContest(
        contest.contestId,
        contest.sequenceOrder,
        contest.contestDescriptionHash,
        newMap
      );
    } else {
      throw new Error(
        `incompatible: cannot add contest for ${contest.contestId} to ${this.contestId}`
      );
    }
  }
}

/**
 * The homomorphic accumulation of all of the CiphertextBallot.Selection for a specific
 * selection and contest. The selectionId is the Manifest.SelectionDescription.object_id.
 */
export class CiphertextTallySelection {
  constructor(
    readonly selectionId: string,
    readonly sequenceOrder: number,
    readonly selectionDescriptionHash: ElementModQ, // matches SelectionDescription.cryptoHash
    readonly ciphertext: ElGamalCiphertext
  ) {}

  /**
   * Creates a new tally selection from a single selection.
   * You would then call accumulate() on this with subsequent
   * selections.
   */
  static create(selection: SubmittedSelection): CiphertextTallySelection {
    return new CiphertextTallySelection(
      selection.selectionId,
      selection.sequenceOrder,
      selection.selectionHash,
      selection.ciphertext
    );
  }

  /**
   * Accumulates together an existing tally with a new submitted ballot.
   * The original isn't changed. A new tally is returned.
   */
  accumulate(selection: CiphertextTallySelection): CiphertextTallySelection {
    if (
      selection.selectionId === this.selectionId &&
      selection.sequenceOrder === this.sequenceOrder &&
      selection.selectionDescriptionHash.equals(this.selectionDescriptionHash)
    ) {
      return new CiphertextTallySelection(
        this.selectionId,
        this.sequenceOrder,
        this.selectionDescriptionHash,
        elGamalAdd(this.ciphertext, selection.ciphertext)
      );
    } else {
      throw new Error(
        `incompatible: cannot add selection for ${selection.selectionId} to ${this.selectionId}`
      );
    }
  }
}
