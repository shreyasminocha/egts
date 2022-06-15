import fc from 'fast-check';
import {
  BallotState,
  bigIntContext3072,
  matchingArraysOfAnyElectionObjects,
  Nonces,
} from '../../../src/electionguard';
import {decryptAndVerifyBallot} from '../../../src/electionguard/ballot/decrypt';
import {
  encryptBallot,
  EncryptionState,
} from '../../../src/electionguard/ballot/encrypt';
import {elementModQ} from '../core/generators';
import {electionAndBallots} from './generators';

const groupContext = bigIntContext3072();
describe('Election encryption and tallying', () => {
  test('Generators yield valid contests', () => {
    fc.assert(
      fc.property(electionAndBallots(groupContext), eb => {
        const contests = eb.manifest.contests;
        const contestsValid = contests.every(c => c.isValid());
        expect(contestsValid).toBe(true);
      })
    );
  });
  test('Encryption/decryption inverses', () => {
    fc.assert(
      fc.property(
        electionAndBallots(groupContext),
        elementModQ(groupContext),
        (eb, seed) => {
          const nonces = new Nonces(seed);
          // This ends up running the verification twice: once while encrypting, and once while decrypting.
          // This is fine, because we'd like to catch verification errors at encryption time, if possible,
          // but we'll take them wherever we can get them.

          const encryptionState = new EncryptionState(
            groupContext,
            eb.manifest,
            eb.electionContext,
            true
          );
          const submittedBallots = eb.ballots.map((b, i) =>
            encryptBallot(encryptionState, b, nonces.get(i)).submit(
              BallotState.CAST
            )
          );
          const decryptedBallots = submittedBallots.map(sb =>
            decryptAndVerifyBallot(
              eb.manifest,
              eb.electionContext.cryptoExtendedBaseHash,
              eb.keypair,
              sb
            )
          );

          expect(
            matchingArraysOfAnyElectionObjects(eb.ballots, decryptedBallots)
          ).toBe(true);
        }
      )
    );
  });

  // TODO: test that no nonces are reused in the same election.

  // TODO: test that when you add the ballots (elGamalAdd), then
  //   decrypt, you get the proper tally (which you can also compute
  //   directly from the plaintext).
});
