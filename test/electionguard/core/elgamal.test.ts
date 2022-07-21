import * as fc from 'fast-check';
import {
  ElGamalKeypair,
  bigIntContext3072,
  bigIntContext4096,
  GroupContext,
} from '../../../src/electionguard';
import {
  elGamalAdd,
  elGamalEncrypt,
} from '../../../src/electionguard/core/elgamal';
import {elementModQ, elGamalKeypair, fcFastConfig} from './generators';

function testElGamal(context: GroupContext) {
  describe(`${context.name}: ElGamal properties`, () => {
    test('encryption/decryption', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          fc.nat(1000),
          fc.nat(1000),
          elementModQ(context, 2),
          elementModQ(context, 2),
          (keypair, p1, p2, nonce1, nonce2) => {
            const c1 = elGamalEncrypt(keypair, p1, nonce1);
            const p1a = c1.decrypt(keypair);
            expect(p1a).toEqual(p1); // decryption is the inverse of encryption

            const c2 = elGamalEncrypt(keypair, p2, nonce2);
            const p2a = c2.decryptWithNonce(keypair, nonce2);
            expect(p2a).toEqual(p2);

            // different nonces or different plaintexts yield different ciphertexts
            expect(c1.equals(c2)).toBe(nonce1.equals(nonce2) && p1 === p2);

            const c3 = elGamalAdd(c1, c2);
            const p3a = c3.decrypt(keypair);

            // homomorphic accumulation should be the same as plaintext accumulation
            expect(p3a).toEqual(p1 + p2);
          }
        ),
        fcFastConfig
      );
    });
    test('elGamalEncrypt edge cases', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          fc.nat(1000),
          elementModQ(context, 2),
          (keypair, p, nonce) => {
            expect(() =>
              elGamalEncrypt(keypair, p, context.ZERO_MOD_Q)
            ).toThrow();
            expect(() =>
              elGamalEncrypt(keypair, p, context.ONE_MOD_Q)
            ).toThrow();
            expect(() => elGamalEncrypt(keypair, 0, nonce)).not.toThrow();
            expect(() => elGamalEncrypt(keypair, -1, nonce)).toThrow();
            expect(() => elGamalEncrypt(keypair, 3.14, nonce)).toThrow();
          }
        )
      );
    });
    test('elGamalAdd edge cases', () => {
      expect(() => elGamalAdd()).toThrow();
    });
  });

  describe(`${context.name}: ElGamalKeypair`, () => {
    test('createFromSecret', () => {
      expect(() =>
        ElGamalKeypair.createFromSecret(context.ZERO_MOD_Q)
      ).toThrow();
      expect(() =>
        ElGamalKeypair.createFromSecret(context.ONE_MOD_Q)
      ).toThrow();
    });
    test('inversePublicKeyElement', () => {
      const keypair = ElGamalKeypair.createRandom(context);
      const pkInverse = keypair.inversePublicKeyElement;
      const pk = keypair.publicKeyElement;
      expect(context.multP(pk, pkInverse).equals(context.ONE_MOD_P)).toBe(true);
    });
  });
}

testElGamal(bigIntContext4096());
testElGamal(bigIntContext3072());
