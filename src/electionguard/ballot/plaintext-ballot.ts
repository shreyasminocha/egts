import {
  ElectionObjectBase,
  matchingArraysOfAnyElectionObjects,
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
      matchingArraysOfAnyElectionObjects(other.contests, this.contests)
    );
  }
}

/** The plaintext representation of a voter's selections for one contest. */
export class PlaintextContest implements ElectionObjectBase {
  constructor(
    readonly contestId: string, // matches ContestDescription.contestId
    readonly selections: Array<PlaintextSelection> = []
  ) {}

  get objectId(): string {
    return this.contestId;
  }

  equals(other: PlaintextContest): boolean {
    return (
      other instanceof PlaintextContest &&
      other.contestId === this.contestId &&
      matchingArraysOfAnyElectionObjects(other.selections, this.selections)
    );
  }
}

/** The plaintext representation of one selection for a particular contest. */
export class PlaintextSelection implements ElectionObjectBase {
  constructor(
    readonly selectionId: string, // matches SelectionDescription.selectionId
    readonly vote: number,
    readonly isPlaceholderSelection: boolean = false,
    readonly writeIn?: string
  ) {}

  get objectId(): string {
    return this.selectionId;
  }

  equals(other: PlaintextSelection): boolean {
    return (
      other instanceof PlaintextSelection &&
      other.selectionId === this.selectionId &&
      other.vote === this.vote &&
      other.isPlaceholderSelection === this.isPlaceholderSelection &&
      other.writeIn === this.writeIn
    );
  }
}
