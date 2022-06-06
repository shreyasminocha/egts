import {Arbitrary} from 'fast-check';
import * as C from 'io-ts/Codec';
import * as fc from 'fast-check';
import {
  elementModP,
  elementModQ,
  elGamalCiphertextAndContext,
  elGamalKeypair,
  fcFastConfig,
  uInt256,
  uint8ArrayReasonable,
} from './generators';
import {
  eitherRightOrFail,
  getCodecsForContext,
} from '../../../src/electionguard/core/json';
import {GroupContext} from '../../../src/electionguard/core/group-common';
import {bigIntContext3072} from '../../../src/electionguard/core/group-bigint';
import {HashedElGamalCiphertext} from '../../../src/electionguard/core/hashed-elgamal';
import {arraysEqual} from '../../../src/electionguard/core/utils';

function testCodecLaws<T>(
  contextName: string,
  typeName: string,
  generator: Arbitrary<T>,
  codec: C.Codec<unknown, unknown, T>,
  equality: (a: T, b: T) => boolean
) {
  describe(`${contextName}: tests for ${typeName}`, () => {
    test('serialize / deserialize', () => {
      fc.assert(
        fc.property(generator, (value: T) => {
          const serialized = codec.encode(value);
          const deserialized = codec.decode(serialized);
          const unpacked = eitherRightOrFail(deserialized);
          expect(equality(value, unpacked)).toBe(true);

          // now we'll make sure we can go to strings and back
          const serializedStr = JSON.stringify(serialized);
          const backToObject = JSON.parse(serializedStr);
          const deserialized2 = codec.decode(backToObject);
          expect(equality(value, eitherRightOrFail(deserialized2))).toBe(true);
        }),
        fcFastConfig
      );
    });
  });
}

function testCodecsForContext(context: GroupContext) {
  const codecs = getCodecsForContext(context);
  testCodecLaws(
    context.name,
    'Uint8Array',
    uint8ArrayReasonable(),
    codecs.uInt8ArrayCodec,
    arraysEqual
  );
  testCodecLaws(
    context.name,
    'UInt256',
    uInt256(),
    codecs.uInt256Codec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElementModP',
    elementModP(context),
    codecs.elementModPCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElementModQ',
    elementModQ(context),
    codecs.elementModQCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElGamalPublicKey',
    elGamalKeypair(context).map(k => k.publicKey),
    codecs.elGamalPublicKeyCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElGamalSecretKey',
    elGamalKeypair(context).map(k => k.secretKey),
    codecs.elGamalSecretKeyCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElGamalKeypair',
    elGamalKeypair(context),
    codecs.elGamalKeypairCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElGamalCiphertext',
    elGamalCiphertextAndContext(context).map(x => x.ciphertext),
    codecs.elGamalCiphertextCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ConstantChaumPedersenProofKnownNonce',
    elGamalCiphertextAndContext(context).map(x => x.constantProofKnownNonce),
    codecs.constantChaumPedersenProofKnownNonceCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ConstantChaumPedersenProofKnownSecretKey',
    elGamalCiphertextAndContext(context).map(
      x => x.constantProofKnownSecretKey
    ),
    codecs.constantChaumPedersenProofKnownSecretKeyCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'DisjunctiveChaumPedersenProofKnownNonce',
    elGamalCiphertextAndContext(context).map(x => x.disjunctiveProofKnownNonce),
    codecs.disjunctiveChaumPedersenProofKnownNonceCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'HashedElGamalCiphertext',
    fc
      .tuple(
        elGamalKeypair(context),
        elementModQ(context, 2),
        uint8ArrayReasonable()
      )
      .map(t => {
        const [kp, nonce, bytes] = t;
        return HashedElGamalCiphertext.encrypt(kp, bytes, nonce);
      }),
    codecs.hashedElGamalCiphertextCodec,
    (a, b) => a.equals(b)
  );
}

// testCodecsForContext(bigIntContext4096);
testCodecsForContext(bigIntContext3072());
