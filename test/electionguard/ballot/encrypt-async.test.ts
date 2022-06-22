import fc from 'fast-check';
import * as log from '../../../src/electionguard/core/logging';
import {
  bigIntContext3072,
  getCoreCodecsForContext,
} from '../../../src/electionguard';
import {
  encryptBallot,
  EncryptionState,
} from '../../../src/electionguard/ballot/encrypt';
import {AsyncBallotEncryptor} from '../../../src/electionguard/ballot/encrypt-async';
import {elementModQ, fcFastConfig} from '../core/generators';
import {electionAndBallots} from './generators';
import {getBallotCodecsForContext} from '../../../src/electionguard/ballot/json';
import * as Either from 'fp-ts/lib/Either';

const groupContext = bigIntContext3072();
describe('Async encryption wrapper', () => {
  afterAll(() => {
    console.info('After-action report for async-encryption:');
    log.consoleAllLogs();
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

          log.info('encrypt-async-test', 'getting codecs');
          const bcodecs = getBallotCodecsForContext(groupContext);
          const ecodecs = getCoreCodecsForContext(groupContext);

          log.info('encrypt-async-test', 'encoding manifest');
          const manifestJson = bcodecs.manifestCodec.encode(
            eb.manifest
          ) as object;
          log.info('encrypt-async-test', 'encoding election context');
          const electionContextJson = ecodecs.electionContextCodec.encode(
            eb.electionContext
          ) as object;

          log.info('encrypt-async-test', 'decoding manifest');
          const manifestDecoded = bcodecs.manifestCodec.decode(manifestJson);
          log.info('encrypt-async-test', 'decoding election context');
          const electionContextDecoded =
            ecodecs.electionContextCodec.decode(electionContextJson);
          expect(Either.isRight(manifestDecoded)).toBeTruthy();
          expect(Either.isRight(electionContextDecoded)).toBeTruthy();

          log.info('encrypt-async-test', 'initializing async encryption');
          const asyncEncryptor = AsyncBallotEncryptor.create(
            manifestJson,
            electionContextJson,
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
