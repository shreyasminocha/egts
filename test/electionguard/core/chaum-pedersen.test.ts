import * as fc from 'fast-check';
import {
  ElGamalKeypair,
  GroupContext,
  bigIntContext3072,
  CompactGenericChaumPedersenProof,
  ExpandedGenericChaumPedersenProof,
} from '../../../src/electionguard';
import {elGamalEncrypt} from '../../../src/electionguard/core/elgamal';
import * as CP from '../../../src/electionguard/core/chaum-pedersen';
import {
  divP,
  multP,
  negateQ,
  powP,
} from '../../../src/electionguard/core/group-common';
import {
  elementModQ,
  elGamalKeypair,
  fcFastConfig,
  validElementModP,
} from './generators';

function testChaumPedersen(context: GroupContext) {
  describe(`${context.name}: generics`, () => {
    test('super simple known nonce, encrypt 0', () => {
      const secret = context.createElementModQ(3) || fail();
      const kp = ElGamalKeypair.createFromSecret(secret);
      const nonce = context.createElementModQ(5) || fail();
      const ciphertext = elGamalEncrypt(kp, 0, nonce);
      const w = context.createElementModQ(7) || fail();

      const generic = CompactGenericChaumPedersenProof.create(
        w,
        context.G_MOD_P,
        kp.publicKeyElement,
        nonce,
        ['hello', 'world']
      );

      expect(
        generic.isValid(
          context.G_MOD_P,
          ciphertext.pad,
          kp.publicKeyElement,
          ciphertext.data,
          ['hello', 'world'],
          true
        )
      ).toBe(true);
    });
    test('super simple known secret, encrypt 0', () => {
      // console.log('Starting super simple known secret test');
      const secret = context.createElementModQ(3) || fail();
      const kp = ElGamalKeypair.createFromSecret(secret);
      const nonce = context.createElementModQ(5) || fail();
      const ciphertext = elGamalEncrypt(kp, 0, nonce);
      const proofW = context.createElementModQ(7) || fail();

      // paranoia: if these aren't true, something's really, really wrong
      expect(ciphertext.pad).toEqual(context.gPowP(nonce));
      expect(ciphertext.pad).toEqual(powP(context.G_MOD_P, nonce));
      expect(ciphertext.data).toEqual(powP(kp.publicKeyElement, nonce));
      expect(
        kp.publicKeyElement.equals(context.gPowP(kp.secretKeyElement))
      ).toBe(true);

      // console.log('Sanity checks all good');

      const generic = CompactGenericChaumPedersenProof.create(
        proofW,
        context.G_MOD_P, // g
        ciphertext.pad, // h = g^r
        kp.secretKeyElement, // x = a
        ['hello', 'world'] // hashHeader
      );

      const expandedProof = generic.expand(
        context.G_MOD_P, // g
        kp.publicKeyElement, // gx = g^a
        ciphertext.pad, // h = g^r
        ciphertext.data // hx = g^ar * g^0 = g^ar
      );

      // console.log('Proof reconstruction:');
      // console.log(`a = ${expandedProof.a.toString()}`);
      // console.log(`b = ${expandedProof.b.toString()}`);
      // console.log(`xc = ${multQ(kp.secretKeyElement, expandedProof.c)}`);
      // console.log(`r = ${expandedProof.r}`);

      expect(expandedProof.b).toEqual(powP(ciphertext.pad, proofW)); // works

      // console.log('Other variations for a:');
      const gr = context.gPowP(expandedProof.r); // g^r = g^{w + xc}
      const a1 = multP(gr, powP(kp.publicKeyElement, negateQ(expandedProof.c))); // cancelling out the xc, getting g^w
      const a2 = divP(gr, powP(kp.publicKeyElement, expandedProof.c)); // cancelling out the xc, getting g^w
      // console.log(`a1 (manual) = ${a1.toString()}`);
      // console.log(`a2 (manual) = ${a2.toString()}`);

      expect(a1).toEqual(a2);
      const gW = context.gPowP(proofW);
      // console.log(`gW = ${gW.toString()}`);

      expect(expandedProof.a).toEqual(a1);
      expect(expandedProof.a).toEqual(a2);
      expect(expandedProof.a).toEqual(gW);

      expect(
        expandedProof.isValid(
          context.G_MOD_P, // g
          kp.publicKeyElement, // gx = g^a
          ciphertext.pad, // h = g^r
          ciphertext.data, // hx = g^ar * g^0 = g^ar
          ['hello', 'world'], // hashHeader
          true // checkC
        )
      ).toBe(true);
    });
    test('generic test of generic proof', () => {
      fc.assert(
        fc.property(
          elementModQ(context, 2),
          validElementModP(context),
          elementModQ(context, 2),
          (w, h, x) => {
            const g = context.G_MOD_P;
            const gx = powP(g, x);
            const hx = powP(h, x);
            const proof = ExpandedGenericChaumPedersenProof.create(w, g, h, x, [
              'hello',
              'world',
            ]);
            expect(proof.isValid(g, gx, h, hx, ['hello', 'world'], true)).toBe(
              true
            );

            const compact = proof.compact();
            expect(
              compact.isValid(g, gx, h, hx, ['hello', 'world'], true)
            ).toBe(true);

            const backToFull = compact.expand(g, gx, h, hx);
            expect(backToFull).toEqual(proof);
          }
        ),
        fcFastConfig
      );
    });
  });

  describe(`${context.name}: ChaumPedersen known nonce`, () => {
    test('proofs validate', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          fc.nat(100),
          elementModQ(context, 2),
          elementModQ(context, 2),
          elementModQ(context, 2),
          (kp, plaintext, nonce, seed, qbar) => {
            const ciphertext = elGamalEncrypt(kp, plaintext, nonce);
            const proof = CP.ConstantChaumPedersenProofKnownNonce.create(
              ciphertext,
              plaintext,
              nonce,
              kp.publicKey,
              seed,
              qbar
            );
            expect(
              proof.isValid(ciphertext, kp.publicKey, qbar, plaintext)
            ).toBe(true);
            expect(
              proof.isValid(ciphertext, kp.publicKey, qbar, plaintext + 1)
            ).toBe(false);
          }
        ),
        fcFastConfig
      );
    });
  });

  describe(`${context.name}: ChaumPedersen known secret`, () => {
    test('proofs validate', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          fc.nat(100),
          elementModQ(context, 2),
          elementModQ(context, 2),
          elementModQ(context, 2),
          (kp, plaintext, nonce, seed, qbar) => {
            const ciphertext = elGamalEncrypt(kp, plaintext, nonce);
            const proof = CP.ConstantChaumPedersenProofKnownSecretKey.create(
              ciphertext,
              plaintext,
              kp,
              seed,
              qbar
            );
            expect(
              proof.isValid(ciphertext, kp.publicKey, qbar, plaintext)
            ).toBe(true);
            expect(
              proof.isValid(ciphertext, kp.publicKey, qbar, plaintext + 1)
            ).toBe(false);
          }
        ),
        fcFastConfig
      );
    });
  });

  describe(`${context.name}: DisjunctiveChaumPedersen`, () => {
    test('proofs validate', () => {
      fc.assert(
        fc.property(
          elGamalKeypair(context),
          elementModQ(context, 2),
          elementModQ(context, 2),
          elementModQ(context, 2),
          (kp, nonce, seed, qbar) => {
            const ciphertext0 = elGamalEncrypt(kp, 0, nonce);
            const ciphertext1 = elGamalEncrypt(kp, 1, nonce);

            const goodProof0 =
              CP.DisjunctiveChaumPedersenProofKnownNonce.create(
                ciphertext0,
                0,
                nonce,
                kp,
                seed,
                qbar
              );

            const goodProof1 =
              CP.DisjunctiveChaumPedersenProofKnownNonce.create(
                ciphertext1,
                1,
                nonce,
                kp,
                seed,
                qbar
              );

            expect(goodProof0.isValid(ciphertext0, kp.publicKey, qbar)).toBe(
              true
            );
            expect(goodProof1.isValid(ciphertext1, kp.publicKey, qbar)).toBe(
              true
            );
            expect(
              goodProof1.isValid(
                ciphertext0,
                kp.publicKey,
                qbar,
                true /* suppressWarnings */
              )
            ).toBe(false);
          }
        ),
        fcFastConfig
      );
    });
  });
}

testChaumPedersen(bigIntContext3072());
