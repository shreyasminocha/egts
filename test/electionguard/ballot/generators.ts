import fc from 'fast-check';
import {GroupContext, numberRange, zipMap4} from '../../../src/electionguard';
import * as M from '../../../src/electionguard/ballot/manifest';
import { arrayIndexedArbitrary } from '../core/generators';

const _first_names = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Margaret',
  'Matthew',
  'Lisa',
  'Anthony',
  'Betty',
  'Donald',
  'Dorothy',
  'Sylvia',
  'Viktor',
  'Camille',
  'Mirai',
  'Anant',
  'Rohan',
  'François',
  'Altuğ',
  'Sigurður',
  'Böðmóður',
  'Quang Dũng',
];

const _last_names = [
  'SMITH',
  'JOHNSON',
  'WILLIAMS',
  'JONES',
  'BROWN',
  'DAVIS',
  'MILLER',
  'WILSON',
  'MOORE',
  'TAYLOR',
  'ANDERSON',
  'THOMAS',
  'JACKSON',
  'WHITE',
  'HARRIS',
  'MARTIN',
  'THOMPSON',
  'GARCIA',
  'MARTINEZ',
  'ROBINSON',
  'CLARK',
  'RODRIGUEZ',
  'LEWIS',
  'LEE',
  'WALKER',
  'HALL',
  'ALLEN',
  'YOUNG',
  'HERNANDEZ',
  'KING',
  'WRIGHT',
  'LOPEZ',
  'HILL',
  'SCOTT',
  'GREEN',
  'ADAMS',
  'BAKER',
  'GONZALEZ',
  'STEELE-LOY',
  "O'CONNOR",
  'ANAND',
  'PATEL',
  'GUPTA',
  'ĐẶNG',
];

export function humanName(): fc.Arbitrary<string> {
  return fc
    .tuple(fc.constantFrom(..._first_names), fc.constantFrom(..._last_names))
    .map(t => {
      const [firstName, lastName] = t;
      return `${firstName} ${lastName}`;
    });
}

export function twoLetterCode(): fc.Arbitrary<string> {
  return fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    {minLength: 2, maxLength: 2}
  );
}

export function language(
  context: GroupContext
): fc.Arbitrary<M.ManifestLanguage> {
  return fc.tuple(fc.emailAddress(), twoLetterCode()).map(t => {
    const [email, language] = t;
    return new M.ManifestLanguage(context, email, language);
  });
}

export function languageHumanName(
  context: GroupContext
): fc.Arbitrary<M.ManifestLanguage> {
  return fc.tuple(humanName(), twoLetterCode()).map(t => {
    const [name, language] = t;
    return new M.ManifestLanguage(context, name, language);
  });
}

export function emailAnnotatedString(
  context: GroupContext
): fc.Arbitrary<M.ManifestAnnotatedString> {
  return fc.tuple(twoLetterCode(), fc.emailAddress()).map(t => {
    const [language, email] = t;
    return new M.ManifestAnnotatedString(context, language, email);
  });
}

export function internationalizedText(
  context: GroupContext
): fc.Arbitrary<M.ManifestInternationalizedText> {
  return fc.array(language(context), {minLength: 1, maxLength: 3}).map(t => {
    return new M.ManifestInternationalizedText(context, t);
  });
}

export function internationalizedHumanName(
  context: GroupContext
): fc.Arbitrary<M.ManifestInternationalizedText> {
  return fc
    .array(languageHumanName(context), {minLength: 1, maxLength: 3})
    .map(t => {
      return new M.ManifestInternationalizedText(context, t);
    });
}

export function annotatedString(
  context: GroupContext
): fc.Arbitrary<M.ManifestAnnotatedString> {
  return language(context).map(t => {
    return new M.ManifestAnnotatedString(context, t.language, t.value);
  });
}

export function electionType(): fc.Arbitrary<M.ManifestElectionType> {
  return fc
    .constantFrom(...Object.keys(M.ManifestElectionType))
    .filter(t => t !== 'unknown')
    .map(t => M.ManifestElectionType[t as keyof typeof M.ManifestElectionType]);
}

export function reportingUnitType(): fc.Arbitrary<M.ManifestReportingUnitType> {
  return fc
    .constantFrom(...Object.keys(M.ManifestReportingUnitType))
    .filter(t => t !== 'unknown')
    .map(
      t =>
        M.ManifestReportingUnitType[
          t as keyof typeof M.ManifestReportingUnitType
        ]
    );
}

export function contactInformation(
  context: GroupContext
): fc.Arbitrary<M.ManifestContactInformation> {
  return fc.tuple(emailAnnotatedString(context), humanName()).map(t => {
    const [email, name] = t;
    return new M.ManifestContactInformation(context, [], [email], [], name);
  });
}

export function stringToInternational(
  context: GroupContext,
  input: string
): M.ManifestInternationalizedText {
  return new M.ManifestInternationalizedText(context, [
    new M.ManifestLanguage(context, input, 'EN'),
  ]);
}

export function ballotStyle(
  context: GroupContext,
  parties: Array<M.ManifestParty>,
  geoUnits: Array<M.ManifestGeopoliticalUnit>
): fc.Arbitrary<M.ManifestBallotStyle> {
  if (parties.length === 0 || geoUnits.length === 0) {
    throw new Error('non-zero length inputs required for ballotStyle');
  }
  const gpUnitIds = geoUnits.map(t => t.objectId);
  const partyIds = parties.map(t => t.objectId);

  return fc.tuple(fc.webUrl(), fc.uuid()).map(t => {
    const [url, uuid] = t;
    return new M.ManifestBallotStyle(context, uuid, gpUnitIds, partyIds, url);
  });
}

export function partyLists(
  context: GroupContext,
  numParties: number
): fc.Arbitrary<Array<M.ManifestParty>> {
  if (numParties <= 0) {
    throw new Error('numParties must be > 0');
  }

  const partyNames = numberRange(1, numParties).map(t => `Party${t}`);
  const partyAbbrvs = numberRange(1, numParties).map(t => `P${t}`);

  return fc
    .tuple(
      fc.array(fc.uuid(), {minLength: numParties, maxLength: numParties}),
      fc.array(fc.webUrl(), {minLength: numParties, maxLength: numParties})
    )
    .map(t => {
      const [uuids, urls] = t;
      return zipMap4(
        uuids,
        urls,
        partyNames,
        partyAbbrvs,
        (uuid, url, partyName, partyAbbrv) =>
          new M.ManifestParty(
            context,
            uuid,
            stringToInternational(context, partyName),
            partyAbbrv,
            undefined,
            url
          )
      );
    });
}

export function geopoliticalUnit(
  context: GroupContext
): fc.Arbitrary<M.ManifestGeopoliticalUnit> {
  return fc
    .tuple(
      fc.uuid(),
      fc.string(),
      reportingUnitType(),
      contactInformation(context)
    )
    .map(t => {
      const [uuid, name, reportingType, contactInfo] = t;
      return new M.ManifestGeopoliticalUnit(
        context,
        uuid,
        name,
        reportingType,
        contactInfo
      );
    });
}

export function candidate(
  context: GroupContext,
  partyList: Array<M.ManifestParty> | undefined
): fc.Arbitrary<M.ManifestCandidate> {
  const pidArb =
    partyList !== undefined && partyList.length > 0
      ? fc.constantFrom(...partyList).map(p => p.partyId)
      : fc.constant(undefined);

  return fc
    .tuple(
      fc.uuid(),
      internationalizedHumanName(context),
      pidArb,
      fc.oneof(fc.webUrl(), fc.constant(undefined))
    )
    .map(t => {
      const [uuid, name, partyId, url] = t;
      return new M.ManifestCandidate(context, uuid, name, partyId, url, false);
    });
}

function candidateToSelectionDescription(
  context: GroupContext,
  candidate: M.ManifestCandidate,
  sequenceOrder: number
): M.ManifestSelectionDescription {
  return new M.ManifestSelectionDescription(
    context,
    `c-${candidate.candidateId}`,
    sequenceOrder,
    candidate.candidateId
  );
}

interface CandidatesAndContestDescription {
  candidates: Array<M.ManifestCandidate>;
  contestDescription:
    | M.ManifestCandidateContestDescription
    | M.ManifestReferendumContestDescription;
}

export function candidateContestDescription(
  context: GroupContext,
  sequenceOrder: number,
  partyList: Array<M.ManifestParty>,
  geoUnits: Array<M.ManifestGeopoliticalUnit>,
  n: number | undefined = undefined,
  m: number | undefined = undefined
): fc.Arbitrary<CandidatesAndContestDescription> {
  const nArb = n === undefined ? fc.integer({min: 1, max: 3}) : fc.constant(n);

  return nArb.chain(nFinal => {
    const mArb =
      m === undefined
        ? fc.integer({min: 0, max: 3}).map(m => nFinal + m)
        : fc.constant(m);

    return mArb.chain(mFinal => {
      const partyIds = partyList.map(it => it.partyId);

      return fc
        .array(candidate(context, partyList), {
          minLength: mFinal,
          maxLength: mFinal,
        })
        .chain(contestCandidates => {
          const selectionDescriptions = contestCandidates.map((candidate, i) =>
            candidateToSelectionDescription(context, candidate, i + 1)
          );

          const voteVariation =
            nFinal === 1
              ? M.ManifestVoteVariationType.one_of_m
              : M.ManifestVoteVariationType.n_of_m;

          return fc
            .tuple(
              fc.uuid(),
              fc.constantFrom(...geoUnits).map(it => it.objectId),
              fc.string(),
              internationalizedText(context),
              internationalizedText(context)
            )
            .map(t => {
              const [
                uuid,
                electoralDistrictId,
                name,
                ballotTitle,
                ballotSubtitle,
              ] = t;
              return {
                candidates: contestCandidates,
                contestDescription: new M.ManifestCandidateContestDescription(
                  context,
                  uuid,
                  sequenceOrder,
                  electoralDistrictId,
                  voteVariation,
                  nFinal,
                  mFinal,
                  name,
                  selectionDescriptions,
                  ballotTitle,
                  ballotSubtitle,
                  partyIds
                ),
              };
            });
        });
    });
  });
}

export function candidateContestDescriptionRoomForOvervoting(
  context: GroupContext,
  sequenceOrder: number,
  partyList: Array<M.ManifestParty>,
  geoUnits: Array<M.ManifestGeopoliticalUnit>
): fc.Arbitrary<CandidatesAndContestDescription> {
  return fc
    .integer({min: 1, max: 3})
    .chain(n =>
      fc
        .integer({min: 1, max: 3})
        .chain(m =>
          candidateContestDescription(
            context,
            sequenceOrder,
            partyList,
            geoUnits,
            n,
            n + m
          )
        )
    );
}

export function referendumContestDescription(
  context: GroupContext,
  sequenceOrder: number,
  geoUnits: Array<M.ManifestGeopoliticalUnit>
): fc.Arbitrary<CandidatesAndContestDescription> {
  return fc.integer({min: 1, max: 3}).chain(n => {
    return fc
      .array(candidate(context, undefined), {minLength: n, maxLength: n})
      .chain(contestCandidates => {
        const selectionDescriptions = contestCandidates.map((candidate, i) =>
          candidateToSelectionDescription(context, candidate, i)
        );
        return fc
          .tuple(
            fc.uuid(),
            fc.constantFrom(...geoUnits).map(it => it.objectId),
            fc.string(),
            internationalizedText(context),
            internationalizedText(context)
          )
          .map(t => {
            const [
              uuid,
              electoralDistrictId,
              name,
              ballotTitle,
              ballotSubTitle,
            ] = t;
            return {
              candidates: contestCandidates,
              contestDescription: new M.ManifestReferendumContestDescription(
                context,
                uuid,
                sequenceOrder,
                electoralDistrictId,
                M.ManifestVoteVariationType.one_of_m,
                1,
                n,
                name,
                selectionDescriptions,
                ballotTitle,
                ballotSubTitle
              ),
            };
          });
      });
  });
}

export function contestDescription(
  context: GroupContext,
  sequenceOrder: number,
  partyList: Array<M.ManifestParty>,
  geoUnits: Array<M.ManifestGeopoliticalUnit>
): fc.Arbitrary<CandidatesAndContestDescription> {
  return fc.oneof(
    candidateContestDescription(context, sequenceOrder, partyList, geoUnits),
    referendumContestDescription(context, sequenceOrder, geoUnits)
  );
}

/*
export function electionDescription(
  context: GroupContext,
  maxNumParties = 3,
  maxNumContests = 3
): fc.Arbitrary<M.Manifest> {
  if (maxNumParties <= 0 || maxNumContests <= 0) {
    throw new Error('must have at least one party and at least one contest');
  }

  const result = fc
    .tuple(
      fc.array(geopoliticalUnit(context), {minLength: 1, maxLength: 1}),
      fc.integer({min: 1, max: maxNumParties}),
      fc.integer({min: 1, max: maxNumContests})
    )
    .chain(t => {
      const [geoUnits, numParties, numContests] = t;
      return partyLists(context, numParties).chain(parties =>
        arrayIndexedArbitrary(
          i => contestDescription(context, i + 1, parties, geoUnits),
          numContests
        ).chain(candidateContests => {})
      );
    })
}



@composite
def election_descriptions(
    draw: _DrawType, max_num_parties: int = 3, max_num_contests: int = 3
):
    """
    Generates a `Manifest` -- the top-level object describing an election.
    :param draw: Hidden argument, used by Hypothesis.
    :param max_num_parties: The largest number of parties that will be generated (default: 3)
    :param max_num_contests: The largest number of contests that will be generated (default: 3)
    """
    assert max_num_parties > 0, "need at least one party"
    assert max_num_contests > 0, "need at least one contest"

    geo_units = [draw(geopolitical_units())]
    num_parties: int = draw(integers(1, max_num_parties))

    # keep this small so tests run faster
    parties: List[Party] = draw(party_lists(num_parties))
    num_contests: int = draw(integers(1, max_num_contests))

    # generate a collection candidates mapped to contest descriptions
    candidate_contests: List[Tuple[List[Candidate], ContestDescription]] = [
        draw(contest_descriptions(i, parties, geo_units)) for i in range(num_contests)
    ]
    assert len(candidate_contests) > 0

    candidates_ = reduce(
        lambda a, b: a + b,
        [candidate_contest[0] for candidate_contest in candidate_contests],
    )
    contests = [candidate_contest[1] for candidate_contest in candidate_contests]

    styles = [draw(ballot_styles(parties, geo_units))]

    # maybe later on we'll do something more complicated with dates
    start_date = draw(datetimes())
    end_date = start_date

    return Manifest(
        election_scope_id=draw(emails()),
        spec_version="v0.95",
        type=ElectionType.general,  # good enough for now
        start_date=start_date,
        end_date=end_date,
        geopolitical_units=geo_units,
        parties=parties,
        candidates=candidates_,
        contests=contests,
        ballot_styles=styles,
        name=draw(internationalized_texts()),
        contact_information=draw(contact_infos()),
    )


@composite
def plaintext_voted_ballots(
    draw: _DrawType, internal_manifest: InternalManifest, count: int = 1
):
    """
    Given
    """
    if count == 1:
        return draw(plaintext_voted_ballot(internal_manifest))
    ballots: List[PlaintextBallot] = []
    for _i in range(count):
        ballots.append(draw(plaintext_voted_ballot(internal_manifest)))
    return ballots


@composite
def plaintext_voted_ballot(draw: _DrawType, internal_manifest: InternalManifest):
    """
    Given an `InternalManifest` object, generates an arbitrary `PlaintextBallot` with the
    choices made randomly.
    :param draw: Hidden argument, used by Hypothesis.
    :param internal_manifest: Any `InternalManifest`
    """

    num_ballot_styles = len(internal_manifest.ballot_styles)
    assert num_ballot_styles > 0, "invalid election with no ballot styles"

    # pick a ballot style at random
    ballot_style = internal_manifest.ballot_styles[
        draw(integers(0, num_ballot_styles - 1))
    ]

    contests = internal_manifest.get_contests_for(ballot_style.object_id)
    assert len(contests) > 0, "invalid ballot style with no contests in it"

    voted_contests: List[PlaintextBallotContest] = []
    for contest in contests:
        assert contest.is_valid(), "every contest needs to be valid"
        n = contest.number_elected  # we need exactly this many 1's, and the rest 0's
        ballot_selections = deepcopy(contest.ballot_selections)
        assert len(ballot_selections) >= n

        random = Random(draw(integers()))
        random.shuffle(ballot_selections)
        cut_point = draw(integers(0, n))
        yes_votes = ballot_selections[:cut_point]
        no_votes = ballot_selections[cut_point:]

        voted_selections = [
            selection_from(description, is_placeholder=False, is_affirmative=True)
            for description in yes_votes
        ] + [
            selection_from(description, is_placeholder=False, is_affirmative=False)
            for description in no_votes
        ]

        voted_contests.append(
            PlaintextBallotContest(contest.object_id, voted_selections)
        )

    return PlaintextBallot(str(draw(uuids())), ballot_style.object_id, voted_contests)


CiphertextElectionsTupleType = Tuple[ElementModQ, CiphertextElectionContext]


@composite
def ciphertext_elections(draw: _DrawType, manifest: Manifest):
    """
    Generates a `CiphertextElectionContext` with a single public-private key pair as the encryption context.

    In a real election, the key ceremony would be used to generate a shared public key.

    :param draw: Hidden argument, used by Hypothesis.
    :param manifest: An `Manifest` object, with
    which the `CiphertextElectionContext` will be associated
    :return: a tuple of a `CiphertextElectionContext` and the secret key associated with it
    """
    keypair = draw(elgamal_keypairs())
    secret_key = keypair.secret_key
    public_key = keypair.public_key
    commitment_hash = draw(elements_mod_q_no_zero())
    ciphertext_election_with_secret: CiphertextElectionsTupleType = (
        secret_key,
        make_ciphertext_election_context(
            number_of_guardians=1,
            quorum=1,
            elgamal_public_key=public_key,
            commitment_hash=commitment_hash,
            manifest_hash=manifest.crypto_hash(),
        ),
    )
    return ciphertext_election_with_secret


ElectionsAndBallotsTupleType = Tuple[
    Manifest,
    InternalManifest,
    List[PlaintextBallot],
    ElementModQ,
    CiphertextElectionContext,
]


@composite
def elections_and_ballots(draw: _DrawType, num_ballots: int = 3):
    """
    A convenience generator to generate all of the necessary components for simulating an election.
    Every ballot will match the same ballot style. Hypothesis doesn't
    let us declare a type hint on strategy return values, so you can use `ELECTIONS_AND_BALLOTS_TUPLE_TYPE`.

    :param draw: Hidden argument, used by Hypothesis.
    :param num_ballots: The number of ballots to generate (default: 3).
    :reeturn: a tuple of: an `InternalManifest`, a list of plaintext ballots, an ElGamal secret key,
        and a `CiphertextElectionContext`
    """
    assert num_ballots >= 0, "You're asking for a negative number of ballots?"
    manifest = draw(election_descriptions())
    internal_manifest = InternalManifest(manifest)

    ballots = [
        draw(plaintext_voted_ballots(internal_manifest)) for _ in range(num_ballots)
    ]

    secret_key, context = draw(ciphertext_elections(manifest))

    mock_election: ElectionsAndBallotsTupleType = (
        manifest,
        internal_manifest,
        ballots,
        secret_key,
        context,
    )
    return mock_election

*/
