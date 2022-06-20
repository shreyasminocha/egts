import fc from 'fast-check';
import * as log from '../../../src/electionguard/core/logging';
import {bigIntContext3072} from '../../../src/electionguard';
import {
  encryptBallot,
  EncryptionState,
} from '../../../src/electionguard/ballot/encrypt';
import {AsyncBallotEncryptor} from '../../../src/electionguard/ballot/encrypt-async';
import {elementModQ, fcFastConfig} from '../core/generators';
import {electionAndBallots} from './generators';

const groupContext = bigIntContext3072();
describe('Async encryption wrapper', () => {
  afterAll(() => {
    const allLogs = log.getAllLogs();
    console.log('After-action report for async-encryption:');
    allLogs.forEach(l => console.log(l));
  });

  test('Encrypt conventionally & with async; idential result', async () => {
    fc.assert(
      fc.asyncProperty(
        electionAndBallots(groupContext),
        elementModQ(groupContext),
        async (eb, seed) => {
          log.info('encrypt-async-test', 'starting test');
          const timestamp = Date.now() / 1000;
          const encryptionState = new EncryptionState(
            groupContext,
            eb.manifest,
            eb.electionContext,
            true
          );

          log.info('encrypt-async-test', 'starting conventional encryption');
          const plaintextBallot = eb.ballots[0];
          const encryptedBallot = encryptBallot(
            encryptionState,
            plaintextBallot,
            seed,
            timestamp
          );

          log.info('encrypt-async-test', 'initializing async encryption');
          const asyncEncryptor = AsyncBallotEncryptor.create(
            eb.manifest,
            eb.electionContext,
            true,
            plaintextBallot.ballotStyleId,
            plaintextBallot.ballotId,
            seed,
            timestamp
          );

          log.info('encrypt-async-test', 'launching async encryption');
          // launches encryption on each contest: note the absence of return values
          plaintextBallot.contests.forEach(contest =>
            asyncEncryptor.encrypt(contest)
          );

          const encryptedBallot2 = await asyncEncryptor.getEncryptedBallot();
          log.info('encrypt-async-test', 'async tasks complete');

          expect(encryptedBallot.equals(encryptedBallot2)).toBe(true);
        }
      ),
      fcFastConfig
    );
  });
});
