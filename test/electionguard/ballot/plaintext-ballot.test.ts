import fc from 'fast-check';
import {
  bigIntContext3072,
  shuffleArray,
  PlaintextBallot,
  PlaintextContest,
} from '../../../src/electionguard/';
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
});
