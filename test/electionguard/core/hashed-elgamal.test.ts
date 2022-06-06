import * as fc from 'fast-check';
import {elementModQ, elGamalKeypair, fcFastConfig} from './generators';
import {bigIntContext4096} from '../../../src/electionguard/core/group-bigint';
import {GroupContext} from '../../../src/electionguard/core/group-common';
import {HashedElGamalCiphertext} from '../../../src/electionguard/core/hashed-elgamal';
import {arraysEqual} from '../../../src/electionguard/core/utils';

function testHashedElGamalEncryption(context: GroupContext) {
  describe(`${context.name}: basics`, () => {
    test('encryption/decryption inverses', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          elementModQ(context, 2),
          fc.uint8Array({min: 0, max: 255, minLength: 4, maxLength: 128}),
          (kp, nonce, plaintext) => {
            const ciphertext =
              HashedElGamalCiphertext.encrypt(kp, plaintext, nonce) || fail();
            const plaintextAgain = ciphertext.decrypt(kp) || fail();
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
