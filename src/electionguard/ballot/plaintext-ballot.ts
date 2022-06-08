import {
  ElectionObjectBase,
  matchingArraysOfOrderedElectionObjects,
  OrderedObjectBase,
} from './election-object-base';

/**
 * The plaintext representation of a voter's ballot selections for all the contests in an election.
 * The ballotId is a unique Ballot ID created by the external system. This is used both as input,
 * and for the roundtrip: input -> encrypt -> decrypt -> output.
 */
export class PlaintextBallot implements ElectionObjectBase {
  constructor(
    readonly ballotId: string, // a unique ballot ID created by the external system
    readonly ballotStyleId: string, // matches BallotStyle.ballotStyleId
    readonly contests: Array<PlaintextContest>
  ) {}
  get objectId(): string {
    return this.ballotId;
  }

  equals(other: PlaintextBallot): boolean {
    return (
      other instanceof PlaintextBallot &&
      other.ballotId === this.ballotId &&
      other.ballotStyleId === this.ballotStyleId &&
      matchingArraysOfOrderedElectionObjects(other.contests, this.contests)
    );
  }
}

/** The plaintext representation of a voter's selections for one contest. */
export class PlaintextContest implements OrderedObjectBase {
  constructor(
    readonly contestId: string, // matches ContestDescription.contestId
    readonly sequenceOrder: number,
    readonly selections: Array<PlaintextSelection>
  ) {}

  get objectId(): string {
    return this.contestId;
  }

  equals(other: PlaintextContest): boolean {
    return (
      other instanceof PlaintextContest &&
      other.contestId === this.contestId &&
      other.sequenceOrder === this.sequenceOrder &&
      matchingArraysOfOrderedElectionObjects(other.selections, this.selections)
    );
  }
}

/** The plaintext representation of one selection for a particular contest. */
export class PlaintextSelection implements OrderedObjectBase {
  constructor(
    readonly selectionId: string, // matches SelectionDescription.selectionId
    readonly sequenceOrder: number,
    readonly vote: number,
    readonly isPlaceholderSelection: boolean,
    readonly extendedData?: ExtendedData
  ) {}

  get objectId(): string {
    return this.selectionId;
  }

  equals(other: PlaintextSelection): boolean {
    return (
      other instanceof PlaintextSelection &&
      other.selectionId === this.selectionId &&
      other.sequenceOrder === this.sequenceOrder &&
      other.vote === this.vote &&
      other.isPlaceholderSelection === this.isPlaceholderSelection
    );
    // ignoring extended data
  }
}

/** Used to indicate a write-in candidate. */
export class ExtendedData {
  constructor(readonly value: string, readonly length: number) {}
}
