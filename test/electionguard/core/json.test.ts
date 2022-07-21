import * as fc from 'fast-check';
import {
  getCoreCodecsForContext,
  GroupContext,
  bigIntContext3072,
  HashedElGamalCiphertext,
  HashedElGamalCiphertextCompat,
} from '../../../src/electionguard';
import {arraysEqual} from '../../../src/electionguard/core/utils';
import {testCodecLaws} from './testCodecLaws';
import {
  electionConstants,
  elementModP,
  elementModQ,
  elGamalCiphertextAndContext,
  elGamalKeypair,
  uInt256,
  uint8ArrayReasonable,
} from './generators';

function testCodecsForContext(context: GroupContext) {
  const codecs = getCoreCodecsForContext(context);
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
  testCodecLaws(
    context.name,
    'HashedElGamalCiphertextCompat',
    fc.tuple(elementModP(context), uint8ArrayReasonable(), uInt256()).map(t => {
      const [pad, bytes, mac] = t;
      return new HashedElGamalCiphertextCompat(pad, bytes, mac);
    }),
    codecs.hashedElGamalCiphertextCompatCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElectionConstants',
    electionConstants(context),
    codecs.electionConstantsCodec,
    (a, b) => a.equals(b)
  );
}

// testCodecsForContext(bigIntContext4096);
testCodecsForContext(bigIntContext3072());
