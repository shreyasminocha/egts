import * as fc from 'fast-check';
import {
  ElementModP,
  ElementModQ,
  GroupContext,
  ElGamalCiphertext,
  ElGamalKeypair,
  ConstantChaumPedersenProofKnownNonce,
  ConstantChaumPedersenProofKnownSecretKey,
  DisjunctiveChaumPedersenProofKnownNonce,
  UInt256,
  ElectionConstants,
} from '../../../src/electionguard';
import {BIG_ZERO} from '../../../src/electionguard/core/group-common';
import {elGamalEncrypt} from '../../../src/electionguard/core/elgamal';
import {numberRange} from '../../../src/electionguard/core/utils';

/** Generates arbitrary UInt256 values. */
export function uInt256(): fc.Arbitrary<UInt256> {
  return fc
    .uint8Array({minLength: 32, maxLength: 32, min: 0, max: 255})
    .map(b => new UInt256(b));
}

/** Generates arbitrary Uint8Array values of reasonable sizes. */
export function uint8ArrayReasonable(): fc.Arbitrary<Uint8Array> {
  return fc.uint8Array({minLength: 1, maxLength: 200, min: 0, max: 255});
}

/** Generates arbitrary elements in [minimum, Q). */
export function elementModQ(
  context: GroupContext,
  minimum?: number
): fc.Arbitrary<ElementModQ> {
  return fc
    .bigInt(BIG_ZERO, context.Q)
    .map(x => context.createElementModQSafe(x, minimum));
}

/** Generates arbitrary elements in [1, Q). */
export function elementModQNoZero(
  context: GroupContext
): fc.Arbitrary<ElementModQ> {
  return elementModQ(context, 1);
}

/** Generates arbitrary elements in [0, P). */
export function elementModP(context: GroupContext): fc.Arbitrary<ElementModP> {
  return fc
    .bigInt(BIG_ZERO, context.P)
    .map(x => context.createElementModPSafe(x));
}

/** Generates valid elements in the subgroup in P, i.e., reachable from the generator. */
export function validElementModP(
  context: GroupContext
): fc.Arbitrary<ElementModP> {
  return elementModQ(context).map(x => context.gPowP(x));
}

/** Generates valid ElGamal keypairs. */
export function elGamalKeypair(
  context: GroupContext
): fc.Arbitrary<ElGamalKeypair> {
  return elementModQ(context, 2).map(x => ElGamalKeypair.createFromSecret(x));
}

export function electionConstants(
  context: GroupContext
): fc.Arbitrary<ElectionConstants> {
  // there's exactly one set of constants for a given GroupContext
  return fc.constant(context.electionConstants);
}

interface ElGamalCiphertextAndContext {
  readonly keypair: ElGamalKeypair;
  readonly plaintext: number;
  readonly nonce: ElementModQ;
  readonly ciphertext: ElGamalCiphertext;
  readonly constantProofKnownNonce: ConstantChaumPedersenProofKnownNonce;
  readonly constantProofKnownSecretKey: ConstantChaumPedersenProofKnownSecretKey;
  readonly disjunctiveProofKnownNonce: DisjunctiveChaumPedersenProofKnownNonce;
}

/** Generates a keypair and an encryption using it. */
export function elGamalCiphertextAndContext(
  context: GroupContext
): fc.Arbitrary<ElGamalCiphertextAndContext> {
  return fc
    .tuple(
      elGamalKeypair(context),
      fc.nat(1), // zero or one
      elementModQ(context, 2),
      elementModQ(context, 2),
      elementModQ(context, 2)
    )
    .map(t => {
      const [kp, plaintext, nonce, seed, qbar] = t;
      const ciphertext = elGamalEncrypt(kp, plaintext, nonce);
      return {
        keypair: kp,
        plaintext: plaintext,
        nonce: nonce,
        ciphertext: ciphertext,
        constantProofKnownNonce: ConstantChaumPedersenProofKnownNonce.create(
          ciphertext,
          plaintext,
          nonce,
          kp,
          seed,
          qbar
        ),
        constantProofKnownSecretKey:
          ConstantChaumPedersenProofKnownSecretKey.create(
            ciphertext,
            plaintext,
            kp,
            seed,
            qbar
          ),
        disjunctiveProofKnownNonce:
          DisjunctiveChaumPedersenProofKnownNonce.create(
            ciphertext,
            plaintext,
            nonce,
            kp,
            seed,
            qbar
          ),
      };
    });
}

/**
 * fast-check doesn't provide us an easy way to make an array where the
 * array index is used as part of the generator for each element. This
 * is a hack to solve the problem.
 */
export function arrayIndexedArbitrary<T>(
  func: (i: number) => fc.Arbitrary<T>,
  size: number
): fc.Arbitrary<Array<T>> {
  return fc.tuple(...numberRange(0, size - 1).map(i => func(i)));
}

/**
 * To speed up slow property tests, pass this as the optional second argument
 * to {@link fc.assert}.
 */
export const fcFastConfig = {
  endOnFailure: true, // disable shrinking
  numRuns: 10,
};
