import fc from 'fast-check';
import {
  bigIntContext3072,
  PlaintextBallot,
  PlaintextContest,
} from '../../../src/electionguard';
import {normalizeBallot} from '../../../src/electionguard/ballot/plaintext-ballot';
import {shuffleArray} from '../../../src/electionguard/core/utils';
import {fcFastConfig} from '../core/generators';
import {electionAndBallots} from './generators';

const groupContext = bigIntContext3072();

describe('Plaintext ballots', () => {
  test("Shuffling contests and selections doesn't affect equality", () => {
    fc.assert(
      fc.property(electionAndBallots(groupContext, 1), eb => {
        const [ballot] = eb.ballots;
        const copy = new PlaintextBallot(
          ballot.ballotId,
          ballot.ballotStyleId,
          shuffleArray(
            ballot.contests.map(
              contest =>
                new PlaintextContest(
                  contest.contestId,
                  shuffleArray(contest.selections)
                )
            )
          )
        );
        expect(copy.equals(ballot)).toBe(true);
      })
    );
  });

  test('Normalization works', () => {
    fc.assert(
      fc.property(electionAndBallots(groupContext, 1), eb => {
        const [ballot] = eb.ballots;
        const normalizedBallot = normalizeBallot(ballot, eb.manifest);

        normalizedBallot.contests.forEach(contest => {
          const mcontest = eb.manifest.getContest(contest.contestId);
          expect(mcontest).toBeTruthy();

          expect(contest.selections.map(s => s.selectionId)).toStrictEqual(
            mcontest?.selections.map(s => s.selectionId)
          );
        });
      }),
      fcFastConfig
    );

    // idempotent
    fc.assert(
      fc.property(electionAndBallots(groupContext, 1), eb => {
        const [ballot] = eb.ballots;
        expect(
          normalizeBallot(
            normalizeBallot(ballot, eb.manifest),
            eb.manifest
          ).equals(normalizeBallot(ballot, eb.manifest))
        ).toBe(true);
      }),
      fcFastConfig
    );
  });
});
