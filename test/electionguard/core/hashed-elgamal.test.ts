import * as fc from 'fast-check';
import {
  bigIntContext4096,
  GroupContext,
  HashedElGamalCiphertext,
} from '../../../src/electionguard';
import {arraysEqual} from '../../../src/electionguard/core/utils';
import {elementModQ, elGamalKeypair, fcFastConfig} from './generators';

function testHashedElGamalEncryption(context: GroupContext) {
  describe(`${context.name}: basics`, () => {
    test('encryption/decryption inverses', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          elementModQ(context, 2),
          fc.uint8Array({min: 0, max: 255, minLength: 4, maxLength: 128}),
          (kp, nonce, plaintext) => {
            const ciphertext = HashedElGamalCiphertext.encrypt(
              kp,
              plaintext,
              nonce
            );
            if (ciphertext === undefined) {
              throw new Error('encryption failed');
            }

            const plaintextAgain = ciphertext.decrypt(kp);
            if (plaintextAgain === undefined) {
              throw new Error('decryption failed');
            }

            const samePlaintext = arraysEqual(plaintextAgain, plaintext);
            expect(samePlaintext).toBe(true);

            // if we get even the length wrong, the decryption should fail
            const ciphertext2 = new HashedElGamalCiphertext(
              ciphertext.c0,
              ciphertext.c1,
              ciphertext.c2,
              ciphertext.numBytes - 1
            );
            expect(ciphertext2.decrypt(kp, true)).toBe(undefined);
          }
        ),
        fcFastConfig
      );
    });
  });
}

testHashedElGamalEncryption(bigIntContext4096());
