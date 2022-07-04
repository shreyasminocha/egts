import fc from 'fast-check';
import {
  bigIntContext3072,
  shuffleArray,
  Manifest,
  ManifestContestDescription,
} from '../../../src/electionguard/';
import {fcFastConfig} from '../core/generators';
import {
  electionDescription,
  partyLists,
  geopoliticalUnit,
  contestDescription,
} from './generators';

const groupContext = bigIntContext3072();

describe('Manifest', () => {
  test("Shuffling arrays doesn't affect equality", () => {
    fc.assert(
      fc.property(electionDescription(groupContext), manifest => {
        const copy = new Manifest(
          groupContext,
          manifest.electionScopeId,
          manifest.specVersion,
          manifest.electionType,
          manifest.startDate,
          manifest.endDate,
          shuffleArray(manifest.geopoliticalUnits),
          shuffleArray(manifest.parties),
          shuffleArray(manifest.candidates),
          shuffleArray(manifest.contests),
          shuffleArray(manifest.ballotStyles),
          manifest.name,
          manifest.contactInformation
        );

        expect(copy.equals(manifest)).toBe(true);
      }),
      fcFastConfig
    );
  });
  test.todo('getContest');
  test.todo('getBallotStyle');
  test.todo('getContests');
});

describe('ManifestContestDescription', () => {
  test("Shuffling selections doesn't affect equality", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            partyLists(groupContext, 5),
            fc.uniqueArray(geopoliticalUnit(groupContext), {minLength: 1})
          )
          .chain(([parties, gpIds]) =>
            contestDescription(groupContext, 1, parties, gpIds)
          ),
        c => {
          const contest = c.contestDescription;
          const copy = new ManifestContestDescription(
            groupContext,
            contest.contestId,
            contest.sequenceOrder,
            contest.geopoliticalUnitId,
            contest.voteVariation,
            contest.numberElected,
            contest.votesAllowed,
            contest.name,
            shuffleArray(contest.selections),
            contest.ballotTitle,
            contest.ballotSubtitle
          );

          expect(copy.equals(contest)).toBe(true);
        }
      ),
      fcFastConfig
    );
  });
  test.todo('isValid');
});
