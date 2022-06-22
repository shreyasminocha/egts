import fc from 'fast-check';
import {
  bigIntContext4096,
  eitherRightOrFail,
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

// we support the 3072 and 4096-bit contexts, but we're going
// to test with the bigger context, since it's likely to be
// how we're deployed.
const groupContext = bigIntContext4096();

describe('Async encryption wrapper', () => {
  // afterAll(async () => {
  // console.info('After-action report for async-encryption:');
  // log.consoleAllLogs();
  // });

  test('Encrypt conventionally & with async; idential result', async () => {
    fc.assert(
      fc.asyncProperty(
        electionAndBallots(groupContext),
        elementModQ(groupContext),
        async (eb, seed) => {
          // log.info('encrypt-async-test', 'starting test');
          const timestamp = Date.now() / 1000;
          const encryptionState = new EncryptionState(
            groupContext,
            eb.manifest,
            eb.electionContext,
            true
          );

          // log.info('encrypt-async-test', 'starting conventional encryption');
          const plaintextBallot = eb.ballots[0];
          const encryptedBallot = encryptBallot(
            encryptionState,
            plaintextBallot,
            seed,
            timestamp
          );

          // log.info('encrypt-async-test', 'getting codecs');
          const bCodecs = getBallotCodecsForContext(groupContext);
          const cCodecs = getCoreCodecsForContext(groupContext);

          // log.info('encrypt-async-test', 'encoding manifest');
          const manifestJson = bCodecs.manifestCodec.encode(
            eb.manifest
          ) as object;
          // log.info('encrypt-async-test', 'encoding election context');
          const electionContextJson = cCodecs.electionContextCodec.encode(
            eb.electionContext
          ) as object;

          // log.info('encrypt-async-test', 'decoding manifest');
          /* const manifestDecoded = */ eitherRightOrFail(
            bCodecs.manifestCodec.decode(manifestJson)
          );
          // log.info('encrypt-async-test', 'decoding election context');
          const electionContextDecoded = eitherRightOrFail(
            cCodecs.electionContextCodec.decode(electionContextJson)
          );

          expect(
            electionContextDecoded.jointPublicKey.element.isValidResidue()
          ).toBe(true);

          // log.info('encrypt-async-test', 'initializing async encryption');
          const asyncEncryptor = AsyncBallotEncryptor.create(
            groupContext,
            manifestJson,
            electionContextJson,
            true,
            plaintextBallot.ballotStyleId,
            plaintextBallot.ballotId,
            seed,
            timestamp
          );

          // log.info('encrypt-async-test', 'launching async encryption');
          // launches encryption on each contest: note the absence of return values
          plaintextBallot.contests.forEach(contest =>
            asyncEncryptor.encrypt(contest)
          );

          const encryptedBallot2 = await asyncEncryptor.getEncryptedBallot();
          // log.info('encrypt-async-test', 'async tasks complete');

          expect(encryptedBallot.equals(encryptedBallot2)).toBe(true);
        }
      ),
      fcFastConfig
    );
  });
});
