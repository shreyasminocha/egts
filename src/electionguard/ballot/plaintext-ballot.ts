/**
 * The plaintext representation of a voter's ballot selections for all the contests in an election.
 * The ballotId is a unique Ballot ID created by the external system. This is used both as input,
 * and for the roundtrip: input -> encrypt -> decrypt -> output.
 */
export class PlaintextBallot {
  constructor(
    readonly ballotId: string, // a unique ballot ID created by the external system
    readonly ballotStyleId: string, // matches BallotStyle.ballotStyleId
    readonly contests: Array<PlaintextContest>
  ) {}
}

/** The plaintext representation of a voter's selections for one contest. */
export class PlaintextContest {
  constructor(
    readonly contestId: string, // matches ContestDescription.contestId
    readonly sequenceOrder: number,
    readonly selections: Array<PlaintextSelection>
  ) {}
}

/** The plaintext representation of one selection for a particular contest. */
export class PlaintextSelection {
  constructor(
    readonly selectionId: string, // matches SelectionDescription.selectionId
    readonly sequenceOrder: number,
    readonly vote: number,
    readonly isPlaceholderSelection: boolean,
    readonly extendedData?: ExtendedData
  ) {}
}

/** Used to indicate a write-in candidate. */
export class ExtendedData {
  constructor(readonly value: string, readonly length: number) {}
}
