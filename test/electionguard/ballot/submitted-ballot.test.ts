import fc from 'fast-check';
import {
  bigIntContext3072,
  encryptBallot,
  EncryptionState,
  BallotState,
} from '../../../src/electionguard';
import {Nonces} from '../../../src/electionguard/core/nonces';
import {fcFastConfig, elementModQ} from '../core/generators';
import {electionAndBallots} from './generators';

const groupContext = bigIntContext3072();

describe('SubmittedBallot', () => {
  test("Submitting ciphertext ballots doesn't affect their properties", () => {
    fc.assert(
      fc.property(
        electionAndBallots(groupContext, 1),
        elementModQ(groupContext),
        elementModQ(groupContext),
        (eb, prev, seed) => {
          const timestamp = Math.floor(Date.now() / 1000);
          const nonces = new Nonces(seed);
          const encryptionState = new EncryptionState(
            groupContext,
            eb.manifest,
            eb.electionContext,
            true
          );

          const [ballot] = eb.ballots;
          const ciphertextBallot = encryptBallot(
            encryptionState,
            ballot,
            prev,
            nonces.get(0),
            timestamp
          );
          const submittedBallot = ciphertextBallot.submit(BallotState.CAST);

          expect(submittedBallot.ballotId).toBe(ciphertextBallot.ballotId);
          expect(submittedBallot.ballotStyleId).toBe(
            ciphertextBallot.ballotStyleId
          );
          expect(
            submittedBallot.manifestHash.equals(ciphertextBallot.manifestHash)
          ).toBe(true);
          expect(
            submittedBallot.codeSeed.equals(ciphertextBallot.codeSeed)
          ).toBe(true);
          expect(submittedBallot.code.equals(ciphertextBallot.code)).toBe(true);
          // expect(
          //   submittedBallot.contests.every((c, i) =>
          //     c.equals(ciphertextBallot.contests[i])
          //   )
          // ).toBe(true);
          expect(submittedBallot.timestamp).toBe(ciphertextBallot.timestamp);
          expect(
            submittedBallot.cryptoHashElement.equals(
              ciphertextBallot.cryptoHash
            )
          ).toBe(true);
        }
      ),
      fcFastConfig
    );
  });
});
