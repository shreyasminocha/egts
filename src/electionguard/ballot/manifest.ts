import {ElementModQ, GroupContext} from '../core/group-common';
import {CryptoHashableElement, hashElements} from '../core/hash';

function manifestCryptoHash(
  context: GroupContext,
  electionScopeId: string,
  electionType: ManifestElectionType,
  startDate: string, // LocalDateTime,
  endDate: string, // LocalDateTime,
  geopoliticalUnits: Array<ManifestGeopoliticalUnit>,
  parties: Array<ManifestParty>,
  candidates: Array<ManifestCandidate>,
  contests: Array<ManifestContestDescription>,
  ballotStyles: Array<ManifestBallotStyle>,
  name?: ManifestInternationalizedText,
  contactInformation?: ManifestContactInformation
): ElementModQ {
  return hashElements(
    // follows the python code
    context,
    electionScopeId,
    ManifestElectionType[electionType], // gets string name from enum
    startDate,
    endDate,
    name,
    contactInformation,
    geopoliticalUnits,
    parties,
    // candidates,
    contests,
    ballotStyles
  );
}

function contestDescriptionCryptoHash(
  context: GroupContext,
  contestId: string,
  sequenceOrder: number,
  geopoliticalUnitId: string,
  voteVariation: ManifestVoteVariationType,
  numberElected: number,
  votesAllowed: number,
  name: string,
  selections: Array<ManifestSelectionDescription>,
  ballotTitle?: ManifestInternationalizedText,
  ballotSubtitle?: ManifestInternationalizedText
  // primaryPartyIds: Array<string>
): ElementModQ {
  return hashElements(
    context,
    contestId,
    sequenceOrder,
    geopoliticalUnitId,
    ManifestVoteVariationType[voteVariation], // gets string name from enum
    ballotTitle,
    ballotSubtitle,
    name,
    numberElected,
    votesAllowed,
    selections
    // primaryPartyIds,
  );
}

export function selectionDescriptionCryptoHash(
  context: GroupContext,
  selectionId: string,
  sequenceOrder: number,
  candidateId: string
): ElementModQ {
  return hashElements(context, selectionId, sequenceOrder, candidateId);
}

export function internationalizedTextUnknown(
  context: GroupContext
): ManifestInternationalizedText {
  const text = [new ManifestLanguage(context, 'unknown', 'en')];
  return new ManifestInternationalizedText(context, text);
}

/**
 * The Election Manifest: defines the candidates, contests, and associated information for a
 * specific election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/election)
 */
export class Manifest implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly electionScopeId: string,
    readonly specVersion: string,
    readonly electionType: ManifestElectionType,
    readonly startDate: string, // ISO 8601 formatted date/time
    readonly endDate: string, // ISO 8601 formatted date/time
    readonly geopoliticalUnits: Array<ManifestGeopoliticalUnit>,
    readonly parties: Array<ManifestParty>,
    readonly candidates: Array<ManifestCandidate>,
    readonly contests: Array<ManifestContestDescription>,
    readonly ballotStyles: Array<ManifestBallotStyle>,
    readonly name?: ManifestInternationalizedText,
    readonly contactInformation?: ManifestContactInformation
  ) {
    this.cryptoHashElement = manifestCryptoHash(
      context,
      electionScopeId,
      electionType,
      startDate,
      endDate,
      geopoliticalUnits,
      parties,
      candidates,
      contests,
      ballotStyles,
      name,
      contactInformation
    );
  }

  /**
   * Returns the {@link ManifestContestDescription} in the manifest having the given `contestId` string, or
   * `undefined` if absent.
   */
  getContest(contestId: string): ManifestContestDescription | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.contests.find((v, _i, _o) => v.contestId === contestId);
  }

  /**
   * Returns the {@link ManifestBallotStyle} in the manifest having the given `ballotStyleId` string, or
   * `undefined` if absent.
   */
  getBallotStyle(ballotStyleId: string): ManifestBallotStyle | undefined {
    return this.ballotStyles.find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (v, _i, _o) => v.ballotStyleId === ballotStyleId
    );
  }

  /**
   * Returns all [Manifest.ContestDescription] instances having the given [ballotStyleId] style.
   * Returns [emptyList] if nothing matches.
   */
  getContests(ballotStyleId: string): Array<ManifestContestDescription> {
    const mbs = this.getBallotStyle(ballotStyleId);
    if (mbs === undefined) {
      return [];
    }

    const gpIds = mbs.geopoliticalUnitIds;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.contests.filter((c, _i, _a) =>
      gpIds.includes(c.geopoliticalUnitId)
    );
  }
}

/**
 * The type of election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/election-type)
 */
export enum ManifestElectionType {
  unknown,

  /** For an election held typically on the national day for elections. */
  general,

  /**
   * For a primary election that is for a specific party where voter eligibility is based on
   * registration.
   */
  partisan_primary_closed,

  /**
   * For a primary election that is for a specific party where voter declares desired party or
   * chooses in private.
   */
  partisan_primary_open,

  /** For a primary election without a specified type, such as a nonpartisan primary. */
  primary,

  /**
   * For an election to decide a prior contest that ended with no candidate receiving a
   * majority of the votes.
   */
  runoff,

  /**
   * For an election held out of sequence for special circumstances, for example, to fill a
   * vacated office.
   */
  special,

  /**
   * Used when the election type is not listed in this enumeration. If used, include a
   * specific value of the OtherType element.
   */
  other,
}

/**
 * The type of geopolitical unit.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/reporting-unit-type)
 */
export enum ManifestReportingUnitType {
  unknown,

  /** Used to report batches of ballots that might cross precinct boundaries. */
  ballot_batch,

  /** Used for a ballot-style area that's generally composed of precincts. */
  ballot_style_area,

  /** Used as a synonym for a county. */
  borough,

  /** Used for a city that reports results or for the district that encompasses it. */
  city,

  /** Used for city council districts. */
  city_council,

  /**
   * Used for one or more precincts that have been combined for the purposes of reporting. If
   * the term ward is used interchangeably with combined precinct, use combined-precinct for
   * the ReportingUnitType.
   */
  combined_precinct,

  /** Used for national legislative body districts. */
  congressional,

  /** Used for a country. */
  country,

  /**
   * Used for a county or for the district that encompasses it. Synonymous with borough and
   * parish in some localities.
   */
  county,

  /** Used for county council districts. */
  county_council,

  /** Used for a dropbox for absentee ballots. */
  drop_box,

  /** Used for judicial districts. */
  judicial,

  /**
   * Used as applicable for various units such as towns, townships, villages that report
   * votes, or for the district that encompasses them.
   */
  municipality,

  /** Used for a polling place. */
  polling_place,

  /** Used if the terms for ward or district are used interchangeably with precinct. */
  precinct,

  /** Used for a school district. */
  school,

  /** Used for a special district. */
  special,

  /** Used for splits of precincts. */
  split_precinct,

  /** Used for a state or for the district that encompasses it. */
  state,

  /** Used for a state house or assembly district. */
  state_house,

  /** Used for a state senate district. */
  state_senate,

  /**
   * Used for type of municipality that reports votes or for the district that encompasses it.
   */
  town,

  /**
   * Used for type of municipality that reports votes or for the district that encompasses it.
   */
  township,

  /** Used for a utility district. */
  utility,

  /**
   * Used for a type of municipality that reports votes or for the district that encompasses
   * it.
   */
  village,

  /** Used for a vote center. */
  vote_center,

  /** Used for combinations or groupings of precincts or other units. */
  ward,

  /** Used for a water district. */
  water,

  /**
   * Used for other types of reporting units that aren't included in this enumeration. If
   * used, provide the item's custom type in an OtherType element.
   */
  other,
}

/**
 * Enumeration for contest algorithm or rules in the contest.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/vote-variation)
 */
export enum ManifestVoteVariationType {
  /** Each voter can select up to one option. */
  one_of_m,

  /** Approval voting, where each voter can select as many options as desired. */
  approval,

  /**
   * Borda count, where each voter can rank the options, and the rankings are assigned point
   * values.
   */
  borda,

  /** Cumulative voting, where each voter can distribute their vote to up to N options. */
  cumulative,

  /** A 1-of-m method where the winner needs more than 50% of the vote to be elected. */
  majority,

  /** A method where each voter can select up to N options. */
  n_of_m,

  /**
   * A 1-of-m method where the option with the most votes is elected, regardless of whether
   * the option has more than 50% of the vote.
   */
  plurality,

  /**
   * A proportional representation method, which is any system that elects winners in
   * proportion to the total vote. For the single transferable vote (STV) method, use rcv
   * instead.
   */
  proportional,

  /** Range voting, where each voter can select a score for each option. */
  range,

  /**
   * Ranked choice voting (RCV), where each voter can rank the options, and the ballots are
   * counted in rounds. Also known as instant-runoff voting (IRV) and the single transferable
   * vote (STV).
   */
  rcv,

  /**
   * A 1-of-m method where the winner needs more than some predetermined fraction of the vote
   * to be elected, and where the fraction is more than 50%. For example, the winner might
   * need three-fifths or two-thirds of the vote.
   */
  super_majority,

  /**
   * The vote variation is a type that isn't included in this enumeration. If used, provide
   * the item's custom type in an OtherType element.
   */
  other,
}

/**
 * An annotated character string.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/annotated-string)
 */
export class ManifestAnnotatedString implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly annotation: string,
    readonly value: string
  ) {
    this.cryptoHashElement = hashElements(context, annotation, value);
  }
}

/** Classifies a set of contests by their set of parties and geopolitical units */
export class ManifestBallotStyle implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly ballotStyleId: string,
    readonly geopoliticalUnitIds: Array<string>,
    readonly partyIds: Array<string>,
    readonly imageUri?: string
  ) {
    this.cryptoHashElement = hashElements(
      context,
      ballotStyleId,
      geopoliticalUnitIds,
      partyIds,
      imageUri
    );
  }
}

/**
 * A candidate in a contest. Note: The ElectionGuard Data Spec deviates from the NIST model in
 * that selections for any contest type are considered a "candidate". for instance, on a yes-no
 * referendum contest, two `candidate` objects would be included in the model to represent the
 * `affirmative` and `negative` selections for the contest.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/candidate)
 */
export class ManifestCandidate implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly candidateId: string,
    readonly name: ManifestInternationalizedText,
    readonly partyId: string | undefined,
    readonly imageUri: string | undefined,
    readonly isWriteIn: boolean
  ) {
    this.cryptoHashElement = hashElements(
      context,
      candidateId,
      name,
      partyId,
      imageUri
    );
  }
}

/**
 * Contact information about persons, boards of authorities, organizations, etc.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contact-information)
 */
export class ManifestContactInformation implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly addressLine: Array<string>,
    readonly email: Array<ManifestAnnotatedString>,
    readonly phone: Array<ManifestAnnotatedString>,
    readonly name?: string
  ) {
    this.cryptoHashElement = hashElements(
      context,
      name,
      addressLine,
      email,
      phone
    );
  }
}

/**
 * A physical or virtual unit of representation or vote/seat aggregation. Use this entity to
 * define geopolitical units such as cities, districts, jurisdictions, or precincts to associate
 * contests, offices, vote counts, or other information with those geographies.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/gp-unit)
 */
export class ManifestGeopoliticalUnit implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly geopoliticalUnitId: string,
    readonly name: string,
    readonly type: ManifestReportingUnitType,
    readonly contactInformation?: ManifestContactInformation
  ) {
    this.cryptoHashElement = hashElements(
      context,
      geopoliticalUnitId,
      name,
      ManifestReportingUnitType[type], // gets string name from enum
      contactInformation
    );
  }
}

/**
 * Text that may have translations in multiple languages.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/internationalized-text)
 */
export class ManifestInternationalizedText implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(context: GroupContext, readonly text: Array<ManifestLanguage>) {
    this.cryptoHashElement = hashElements(context, text);
  }
}

/**
 * The ISO-639 language code.
 *
 * @see [ISO 639](https://en.wikipedia.org/wiki/ISO_639)
 */
export class ManifestLanguage implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly value: string,
    readonly language: string
  ) {
    this.cryptoHashElement = hashElements(context, value, language);
  }
}

/**
 * A political party.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/party)
 */
export class ManifestParty implements CryptoHashableElement {
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly partyId: string,
    readonly name: ManifestInternationalizedText,
    readonly abbreviation?: string,
    readonly color?: string,
    readonly logoUri?: string
  ) {
    this.cryptoHashElement = hashElements(
      context,
      partyId,
      name,
      abbreviation,
      color,
      logoUri
    );
  }
}

export type ManifestContestDescription = ManifestCandidateContestDescription; // or ManifestReferendumContestDescription
export type ManifestSelectionDescription =
  ManifestCandidateSelectionDescription; // or ManifestReferendumSelectionDescription
/**
 * The metadata that describes the structure and type of one contest in the election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contest)
 */
export class ManifestCandidateContestDescription
  implements CryptoHashableElement
{
  cryptoHashElement: ElementModQ;
  primaryPartyIds: Array<string>;

  constructor(
    context: GroupContext,
    readonly contestId: string,
    readonly sequenceOrder: number,
    readonly geopoliticalUnitId: string,
    readonly voteVariation: ManifestVoteVariationType,
    readonly numberElected: number,
    readonly votesAllowed: number,
    readonly name: string,
    readonly selections: Array<ManifestCandidateSelectionDescription>,
    readonly ballotTitle?: ManifestInternationalizedText,
    readonly ballotSubtitle?: ManifestInternationalizedText,
    primaryPartyIds?: Array<string>
  ) {
    this.primaryPartyIds = primaryPartyIds === undefined ? [] : primaryPartyIds;
    this.cryptoHashElement = contestDescriptionCryptoHash(
      context,
      contestId,
      sequenceOrder,
      geopoliticalUnitId,
      voteVariation,
      numberElected,
      votesAllowed,
      name,
      selections,
      ballotTitle,
      ballotSubtitle
    );
  }

  /** Internal check that the contest description is self-consistent. */
  isValid(): boolean {
    const validNumberElected = this.numberElected <= this.selections.length;
    const validVotesAllowed = this.numberElected <= this.votesAllowed;
    const candidateIds = new Set(this.selections.map(v => v.candidateId));
    const selectionIds = new Set(this.selections.map(v => v.selectionId));
    const sequenceIds = new Set(this.selections.map(v => v.sequenceOrder));
    const expectedSelectionCount = this.selections.length;

    const noRepeatCandidateIds = candidateIds.size === expectedSelectionCount;
    const noRepeatSelectionIds = selectionIds.size === expectedSelectionCount;
    const noRepeatSequenceIds = sequenceIds.size === expectedSelectionCount;

    const success =
      validNumberElected &&
      validVotesAllowed &&
      noRepeatCandidateIds &&
      noRepeatSelectionIds &&
      noRepeatSelectionIds;

    if (!success) {
      console.warn(
        `Contest ${this.contestId} failed validation check: ${{
          validNumberElected: validNumberElected,
          validVotesAllowed: validVotesAllowed,
          noRepeatCandidateIds: noRepeatCandidateIds,
          noRepeatSelectionIds: noRepeatSelectionIds,
          noRepeatSequenceIds: noRepeatSequenceIds,
        }}`
      );
    }
    return success;
  }
}

/**
 * A ballot selection for a specific candidate in a contest.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/ballot-selection)
 */
export class ManifestCandidateSelectionDescription
  implements CryptoHashableElement
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly selectionId: string,
    readonly sequenceOrder: number,
    readonly candidateId: string
  ) {
    this.cryptoHashElement = selectionDescriptionCryptoHash(
      context,
      selectionId,
      sequenceOrder,
      candidateId
    );
  }
}

/** Constructs a {@link ManifestInternationalizedText} object for a single value and single language. */
export function simpleInternationalText(
  context: GroupContext,
  value: string,
  language: string
): ManifestInternationalizedText {
  return new ManifestInternationalizedText(context, [
    new ManifestLanguage(context, value, language),
  ]);
}

/**
 * Constructs a {@link ManifestParty} object for a single party identifier string and leaves the rest
 * empty.
 */
export function simpleParty(
  context: GroupContext,
  partyId: string
): ManifestParty {
  return new ManifestParty(
    context,
    partyId,
    emptyInternationalizedText(context),
    undefined,
    undefined,
    undefined
  );
}

/**
 * Constructs a {@link ManifestCandidate} object for a simple candidate with a string ID and leaves the
 * rest empty.
 */
export function simpleCandidate(
  context: GroupContext,
  candidateId: string
): ManifestCandidate {
  return new ManifestCandidate(
    context,
    candidateId,
    emptyInternationalizedText(context),
    undefined,
    undefined,
    false
  );
}

/** Constructs an empty {@link ManifestInternationalizedText} object. */
export function emptyInternationalizedText(
  context: GroupContext
): ManifestInternationalizedText {
  return new ManifestInternationalizedText(context, []);
}
