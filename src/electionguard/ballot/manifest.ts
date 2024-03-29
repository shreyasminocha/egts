import {ElementModQ, GroupContext} from '../core/group-common';
import {CryptoHashableElement, hashElements} from '../core/hash';
import {arraysEqual, dateToISOString} from '../core/utils';
import {
  ElectionObjectBase,
  Eq,
  matchingArraysOfAnyElectionObjects,
  matchingArraysWithEquals,
  objEqualsOrUndefEquals,
  OrderedObjectBase,
} from './election-object-base';
import * as log from '../core/logging';

/**
 * The Election Manifest: defines the candidates, contests, and associated information for a
 * specific election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/election)
 */
export class Manifest implements CryptoHashableElement, Eq<Manifest> {
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
    this.cryptoHashElement = hashElements(
      context,
      electionScopeId,
      electionType, // gets string name from enum
      dateToISOString(new Date(startDate)),
      dateToISOString(new Date(endDate)),
      name,
      contactInformation,
      geopoliticalUnits,
      parties,
      // candidates,
      contests,
      ballotStyles
    );
  }

  equals(other: Manifest): boolean {
    return (
      other instanceof Manifest &&
      other.electionScopeId === this.electionScopeId &&
      other.specVersion === this.specVersion &&
      other.electionType === this.electionType &&
      other.startDate === this.startDate &&
      other.endDate === this.endDate &&
      matchingArraysOfAnyElectionObjects(
        other.geopoliticalUnits,
        this.geopoliticalUnits
      ) &&
      matchingArraysOfAnyElectionObjects(other.parties, this.parties) &&
      matchingArraysOfAnyElectionObjects(other.candidates, this.candidates) &&
      matchingArraysOfAnyElectionObjects(other.contests, this.contests) &&
      matchingArraysOfAnyElectionObjects(
        other.ballotStyles,
        this.ballotStyles
      ) &&
      objEqualsOrUndefEquals(other.name, this.name) &&
      objEqualsOrUndefEquals(other.contactInformation, this.contactInformation)
    );
  }

  /**
   * Returns the {@link ManifestContestDescription} in the manifest having the given `contestId` string, or
   * `undefined` if absent.
   */
  getContest(contestId: string): ManifestContestDescription | undefined {
    return this.contests.find(v => v.contestId === contestId);
  }

  /**
   * Returns the {@link ManifestBallotStyle} in the manifest having the given `ballotStyleId` string, or
   * `undefined` if absent.
   */
  getBallotStyle(ballotStyleId: string): ManifestBallotStyle | undefined {
    return this.ballotStyles.find(v => v.ballotStyleId === ballotStyleId);
  }

  /**
   * Returns all {@link ManifestContestDescription} instances having the given `ballotStyleId` style.
   * Returns [] if nothing matches.
   */
  getContests(ballotStyleId: string): Array<ManifestContestDescription> {
    const mbs = this.getBallotStyle(ballotStyleId);
    if (mbs === undefined) {
      return [];
    }

    const gpIds = mbs.geopoliticalUnitIds;
    if (gpIds === undefined) return [];
    return this.contests.filter(c => gpIds.includes(c.geopoliticalUnitId));
  }
}

/**
 * The type of election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/election-type)
 */
export const ManifestElectionTypeStrings = [
  'unknown',

  /** For an election held typically on the national day for elections. */
  'general',

  /**
   * For a primary election that is for a specific party where voter eligibility is based on
   * registration.
   */
  'partisan_primary_closed',

  /**
   * For a primary election that is for a specific party where voter declares desired party or
   * chooses in private.
   */
  'partisan_primary_open',

  /** For a primary election without a specified type, such as a nonpartisan primary. */
  'primary',

  /**
   * For an election to decide a prior contest that ended with no candidate receiving a
   * majority of the votes.
   */
  'runoff',

  /**
   * For an election held out of sequence for special circumstances, for example, to fill a
   * vacated office.
   */
  'special',

  /**
   * Used when the election type is not listed in this enumeration. If used, include a
   * specific value of the OtherType element.
   */
  'other',
];

/** typed union of acceptable strings */
export type ManifestElectionType = typeof ManifestElectionTypeStrings[number];

/**
 * The type of geopolitical unit.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/reporting-unit-type)
 */
export const ManifestReportingUnitTypeStrings = [
  'unknown',

  /** Used to report batches of ballots that might cross precinct boundaries. */
  'ballot_batch',

  /** Used for a ballot-style area that's generally composed of precincts. */
  'ballot_style_area',

  /** Used as a synonym for a county. */
  'borough',

  /** Used for a city that reports results or for the district that encompasses it. */
  'city',

  /** Used for city council districts. */
  'city_council',

  /**
   * Used for one or more precincts that have been combined for the purposes of reporting. If
   * the term ward is used interchangeably with combined precinct, use combined-precinct for
   * the ReportingUnitType.
   */
  'combined_precinct',

  /** Used for national legislative body districts. */
  'congressional',

  /** Used for a country. */
  'country',

  /**
   * Used for a county or for the district that encompasses it. Synonymous with borough and
   * parish in some localities.
   */
  'county',

  /** Used for county council districts. */
  'county_council',

  /** Used for a dropbox for absentee ballots. */
  'drop_box',

  /** Used for judicial districts. */
  'judicial',

  /**
   * Used as applicable for various units such as towns, townships, villages that report
   * votes, or for the district that encompasses them.
   */
  'municipality',

  /** Used for a polling place. */
  'polling_place',

  /** Used if the terms for ward or district are used interchangeably with precinct. */
  'precinct',

  /** Used for a school district. */
  'school',

  /** Used for a special district. */
  'special',

  /** Used for splits of precincts. */
  'split_precinct',

  /** Used for a state or for the district that encompasses it. */
  'state',

  /** Used for a state house or assembly district. */
  'state_house',

  /** Used for a state senate district. */
  'state_senate',

  /**
   * Used for type of municipality that reports votes or for the district that encompasses it.
   */
  'town',

  /**
   * Used for type of municipality that reports votes or for the district that encompasses it.
   */
  'township',

  /** Used for a utility district. */
  'utility',

  /**
   * Used for a type of municipality that reports votes or for the district that encompasses
   * it.
   */
  'village',

  /** Used for a vote center. */
  'vote_center',

  /** Used for combinations or groupings of precincts or other units. */
  'ward',

  /** Used for a water district. */
  'water',

  /**
   * Used for other types of reporting units that aren't included in this enumeration. If
   * used, provide the item's custom type in an OtherType element.
   */
  'other',
];

/** typed union of acceptable strings */
export type ManifestReportingUnitType =
  typeof ManifestReportingUnitTypeStrings[number];

/**
 * Enumeration for contest algorithm or rules in the contest.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/vote-variation)
 */
export const ManifestVoteVariationTypeStrings = [
  /** Each voter can select up to one option. */
  'one_of_m',

  /** Approval voting, where each voter can select as many options as desired. */
  'approval',

  /**
   * Borda count, where each voter can rank the options, and the rankings are assigned point
   * values.
   */
  'borda',

  /** Cumulative voting, where each voter can distribute their vote to up to N options. */
  'cumulative',

  /** A 1-of-m method where the winner needs more than 50% of the vote to be elected. */
  'majority',

  /** A method where each voter can select up to N options. */
  'n_of_m',

  /**
   * A 1-of-m method where the option with the most votes is elected, regardless of whether
   * the option has more than 50% of the vote.
   */
  'plurality',

  /**
   * A proportional representation method, which is any system that elects winners in
   * proportion to the total vote. For the single transferable vote (STV) method, use rcv
   * instead.
   */
  'proportional',

  /** Range voting, where each voter can select a score for each option. */
  'range',

  /**
   * Ranked choice voting (RCV), where each voter can rank the options, and the ballots are
   * counted in rounds. Also known as instant-runoff voting (IRV) and the single transferable
   * vote (STV).
   */
  'rcv',

  /**
   * A 1-of-m method where the winner needs more than some predetermined fraction of the vote
   * to be elected, and where the fraction is more than 50%. For example, the winner might
   * need three-fifths or two-thirds of the vote.
   */
  'super_majority',

  /**
   * The vote variation is a type that isn't included in this enumeration. If used, provide
   * the item's custom type in an OtherType element.
   */
  'other',
];

/** typed union of acceptable strings */
export type ManifestVoteVariationType =
  typeof ManifestVoteVariationTypeStrings[number];

/**
 * An annotated character string.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/annotated-string)
 */
export class ManifestAnnotatedString
  implements CryptoHashableElement, Eq<ManifestAnnotatedString>
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly annotation: string = '',
    readonly value: string = ''
  ) {
    this.cryptoHashElement = hashElements(context, annotation, value);
  }

  equals(other: ManifestAnnotatedString): boolean {
    return (
      other instanceof ManifestAnnotatedString &&
      this.annotation === other.annotation &&
      this.value === other.value
    );
  }
}

/** Classifies a set of contests by their set of parties and geopolitical units */
export class ManifestBallotStyle
  implements CryptoHashableElement, ElectionObjectBase
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly ballotStyleId: string,
    readonly geopoliticalUnitIds?: Array<string>,
    readonly partyIds?: Array<string>,
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

  get objectId(): string {
    return this.ballotStyleId;
  }

  equals(other: ManifestBallotStyle): boolean {
    return (
      other instanceof ManifestBallotStyle &&
      arraysEqual(this.geopoliticalUnitIds, other.geopoliticalUnitIds) &&
      arraysEqual(this.partyIds, other.partyIds) &&
      this.ballotStyleId === other.ballotStyleId &&
      this.imageUri === other.imageUri
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
export class ManifestCandidate
  implements CryptoHashableElement, ElectionObjectBase
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly candidateId: string,
    readonly name: ManifestInternationalizedText = new ManifestInternationalizedText(
      context
    ),
    readonly partyId?: string,
    readonly imageUri?: string,
    readonly isWriteIn?: boolean
  ) {
    this.cryptoHashElement = hashElements(
      context,
      candidateId,
      name,
      partyId,
      imageUri
    );
  }

  get objectId(): string {
    return this.candidateId;
  }

  equals(other: ManifestCandidate): boolean {
    return (
      other instanceof ManifestCandidate &&
      this.candidateId === other.candidateId &&
      objEqualsOrUndefEquals(this.name, other.name) &&
      this.partyId === other.partyId &&
      this.imageUri === other.imageUri &&
      this.isWriteIn === other.isWriteIn
    );
  }
}

/**
 * Contact information about persons, boards of authorities, organizations, etc.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contact-information)
 */
export class ManifestContactInformation
  implements CryptoHashableElement, Eq<ManifestContactInformation>
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly addressLine?: Array<string>,
    readonly email?: Array<ManifestAnnotatedString>,
    readonly phone?: Array<ManifestAnnotatedString>,
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

  equals(other: ManifestContactInformation): boolean {
    return (
      other instanceof ManifestContactInformation &&
      arraysEqual(other.addressLine, this.addressLine) &&
      matchingArraysWithEquals(other.email, this.email) &&
      matchingArraysWithEquals(other.phone, this.phone) &&
      other.name === this.name
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
export class ManifestGeopoliticalUnit
  implements CryptoHashableElement, ElectionObjectBase
{
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
      type,
      contactInformation
    );
  }

  get objectId(): string {
    return this.geopoliticalUnitId;
  }

  equals(other: ManifestGeopoliticalUnit): boolean {
    return (
      other instanceof ManifestGeopoliticalUnit &&
      other.geopoliticalUnitId === this.geopoliticalUnitId &&
      other.name === this.name &&
      other.type === this.type &&
      objEqualsOrUndefEquals(other.contactInformation, this.contactInformation)
    );
  }
}

/**
 * Text that may have translations in multiple languages.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/internationalized-text)
 */
export class ManifestInternationalizedText
  implements CryptoHashableElement, Eq<ManifestInternationalizedText>
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly text: Array<ManifestLanguage> = []
  ) {
    this.cryptoHashElement = hashElements(context, text);
  }

  equals(other: ManifestInternationalizedText): boolean {
    return (
      other instanceof ManifestInternationalizedText &&
      matchingArraysWithEquals(this.text, other.text)
    );
  }

  /** Constructs a {@link ManifestInternationalizedText} object for a single value and single language. */
  static simpleInternationalText(
    context: GroupContext,
    value: string,
    language: string
  ): ManifestInternationalizedText {
    return new ManifestInternationalizedText(context, [
      new ManifestLanguage(context, value, language),
    ]);
  }

  /** Constructs an empty {@link ManifestInternationalizedTest} object with an "unknown" value. */
  static internationalizedTextUnknown(
    context: GroupContext
  ): ManifestInternationalizedText {
    const text = [new ManifestLanguage(context, 'unknown', 'en')];
    return new ManifestInternationalizedText(context, text);
  }
}

/**
 * The ISO-639 language code.
 *
 * @see [ISO 639](https://en.wikipedia.org/wiki/ISO_639)
 */
export class ManifestLanguage
  implements CryptoHashableElement, Eq<ManifestLanguage>
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly value: string,
    readonly language: string = 'en'
  ) {
    this.cryptoHashElement = hashElements(context, value, language);
  }

  equals(other: ManifestLanguage): boolean {
    return (
      other instanceof ManifestLanguage &&
      this.value === other.value &&
      this.language === other.language
    );
  }
}

/**
 * A political party.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/party)
 */
export class ManifestParty
  implements CryptoHashableElement, ElectionObjectBase
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly partyId: string,
    readonly name: ManifestInternationalizedText = new ManifestInternationalizedText(
      context
    ),
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

  get objectId(): string {
    return this.partyId;
  }

  equals(other: ManifestParty): boolean {
    return (
      other instanceof ManifestParty &&
      other.partyId === this.partyId &&
      objEqualsOrUndefEquals(other.name, this.name) &&
      other.abbreviation === this.abbreviation &&
      other.color === this.color &&
      other.logoUri === this.logoUri
    );
  }
}

/**
 * The metadata that describes the structure and type of one contest in the election.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contest)
 */
export class ManifestContestDescription
  implements CryptoHashableElement, OrderedObjectBase
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly contestId: string,
    readonly sequenceOrder: number,
    readonly geopoliticalUnitId: string,
    readonly voteVariation: ManifestVoteVariationType,
    readonly numberElected: number,
    readonly votesAllowed: number | undefined,
    readonly name: string,
    readonly selections: Array<ManifestSelectionDescription> = [],
    readonly ballotTitle?: ManifestInternationalizedText,
    readonly ballotSubtitle?: ManifestInternationalizedText
  ) {
    this.cryptoHashElement = hashElements(
      context,
      contestId,
      sequenceOrder,
      geopoliticalUnitId,
      voteVariation,
      ballotTitle,
      ballotSubtitle,
      name,
      numberElected,
      votesAllowed,
      selections
    );
  }

  get objectId(): string {
    return this.contestId;
  }

  equals(other: ManifestContestDescription): boolean {
    return (
      other instanceof ManifestContestDescription &&
      this.contestId === other.contestId &&
      this.sequenceOrder === other.sequenceOrder &&
      this.geopoliticalUnitId === other.geopoliticalUnitId &&
      this.voteVariation === other.voteVariation &&
      this.numberElected === other.numberElected &&
      this.votesAllowed === other.votesAllowed &&
      this.name === other.name &&
      matchingArraysOfAnyElectionObjects(this.selections, other.selections) &&
      objEqualsOrUndefEquals(this.ballotTitle, other.ballotTitle) &&
      objEqualsOrUndefEquals(this.ballotSubtitle, other.ballotSubtitle)
    );
  }

  /** Internal check that the contest description is self-consistent. */
  isValid(): boolean {
    const validNumberElected = this.numberElected <= this.selections.length;

    // if votesAllowed is undefined, we'll just say it's the maximum number
    const votesAllowed = this.votesAllowed ?? this.numberElected;

    const validVotesAllowed = this.numberElected <= votesAllowed;
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
      noRepeatSequenceIds;

    if (!success) {
      log.warn(
        'ManifestContestDescription',
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
 * The metadata that describes the structure and type of a referendum contest in the election.
 * (Only thing that's different is that candidates can have political parties, while
 * referenda don't.)
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contest)
 */
export class ManifestReferendumContestDescription extends ManifestContestDescription {
  constructor(
    context: GroupContext,
    contestId: string,
    sequenceOrder: number,
    geopoliticalUnitId: string,
    voteVariation: ManifestVoteVariationType,
    numberElected: number,
    votesAllowed: number | undefined,
    name: string,
    selections: Array<ManifestSelectionDescription>,
    ballotTitle?: ManifestInternationalizedText,
    ballotSubtitle?: ManifestInternationalizedText
  ) {
    super(
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
}

/**
 * The metadata that describes the structure and type of a candidate contest in the election.
 * (Only thing that's different is that candidates can have political parties, while
 * referenda don't.)
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/contest)
 */
export class ManifestCandidateContestDescription extends ManifestContestDescription {
  primaryPartyIds: Array<string> | undefined;

  constructor(
    context: GroupContext,
    contestId: string,
    sequenceOrder: number,
    geopoliticalUnitId: string,
    voteVariation: ManifestVoteVariationType,
    numberElected: number,
    votesAllowed: number | undefined,
    name: string,
    selections: Array<ManifestSelectionDescription> = [],
    ballotTitle?: ManifestInternationalizedText,
    ballotSubtitle?: ManifestInternationalizedText,
    primaryPartyIds: Array<string> = []
  ) {
    super(
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
    this.primaryPartyIds = primaryPartyIds;
  }

  equals(other: ManifestCandidateContestDescription): boolean {
    return (
      other instanceof ManifestCandidateContestDescription &&
      super.equals(other) &&
      arraysEqual(other.primaryPartyIds, this.primaryPartyIds)
    );
  }
}

/**
 * A ballot selection for a specific candidate in a contest.
 *
 * @see
 *     [Civics Common Standard Data Specification](https://developers.google.com/elections-data/reference/ballot-selection)
 */
export class ManifestSelectionDescription
  implements CryptoHashableElement, OrderedObjectBase
{
  cryptoHashElement: ElementModQ;

  constructor(
    context: GroupContext,
    readonly selectionId: string,
    readonly sequenceOrder: number,
    readonly candidateId: string
  ) {
    this.cryptoHashElement = hashElements(
      context,
      selectionId,
      sequenceOrder,
      candidateId
    );
  }

  get objectId(): string {
    return this.selectionId;
  }

  equals(other: ElectionObjectBase): boolean {
    return (
      other instanceof ManifestSelectionDescription &&
      other.selectionId === this.selectionId &&
      other.sequenceOrder === this.sequenceOrder &&
      other.candidateId === this.candidateId
    );
  }
}
