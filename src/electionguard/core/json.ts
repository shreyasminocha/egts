import * as D from 'io-ts/Decoder';
import * as E from 'io-ts/Encoder';
import * as C from 'io-ts/Codec';
import {pipe} from 'fp-ts/function';
import {GroupContext, ElementModP, ElementModQ} from './group-common';
import {
  ElGamalCiphertext,
  ElGamalKeypair,
  ElGamalPublicKey,
  ElGamalSecretKey,
} from './elgamal';
import {
  ConstantChaumPedersenProofKnownNonce,
  ConstantChaumPedersenProofKnownSecretKey,
  DisjunctiveChaumPedersenProofKnownNonce,
  ExpandedGenericChaumPedersenProof,
} from './chaum-pedersen';
import {hexToUint8Array, uint8ArrayToHex} from './utils';
import {HashedElGamalCiphertext} from './hashed-elgamal';
import {UInt256} from './uint256';

// These JSON importer/exporter things are using the io-ts package:
// https://github.com/gcanti/io-ts/
// Which, in turn, uses a functional progrmaming library:
// https://github.com/gcanti/fp-ts/

// The decoders have a pipeline where each stage of the pipe is returning Either<Error, T>
// and if an error occurs, the pipeline stops and just returns the error. The output
// isn't actually a JSON string. It's just a JavaScript object with the right fields
// in the right places. You could then call JSON.stringify() on it to get a string,
// and JSON.parse() to get back.

// The encoders don't have to worry about errors, since they presume their input is
// well-formed to begin with.

/**
 * This class gives you a series of {@link C.Codec} codecs. This know how to
 * decode (from ElectionGuard types to plain JS objects, suitable for serialization)
 * and encode (from plain JS objects back to the ElectionGuard types). Note that
 * it's important to use the right codec for the right group. If you decode from
 * a 4096-bit group and encode to a 3072-bit group, the results are not going to
 * be correct.
 */
class Codecs {
  readonly uInt8ArrayCodec: C.Codec<unknown, string, Uint8Array>;
  readonly uInt256Codec: C.Codec<unknown, string, UInt256>;
  readonly elementModPCodec: C.Codec<unknown, string, ElementModP>;
  readonly elementModQCodec: C.Codec<unknown, string, ElementModQ>;
  readonly elGamalPublicKeyCodec: C.Codec<unknown, unknown, ElGamalPublicKey>;
  readonly elGamalSecretKeyCodec: C.Codec<unknown, unknown, ElGamalSecretKey>;
  readonly elGamalKeypairCodec: C.Codec<unknown, unknown, ElGamalKeypair>;
  readonly elGamalCiphertextCodec: C.Codec<unknown, unknown, ElGamalCiphertext>;
  readonly constantChaumPedersenProofKnownNonceCodec: C.Codec<
    unknown,
    unknown,
    ConstantChaumPedersenProofKnownNonce
  >;
  readonly constantChaumPedersenProofKnownSecretKeyCodec: C.Codec<
    unknown,
    unknown,
    ConstantChaumPedersenProofKnownSecretKey
  >;
  readonly disjunctiveChaumPedersenProofKnownNonceCodec: C.Codec<
    unknown,
    unknown,
    DisjunctiveChaumPedersenProofKnownNonce
  >;
  readonly hashedElGamalCiphertextCodec: C.Codec<
    unknown,
    unknown,
    HashedElGamalCiphertext
  >;

  constructor(readonly context: GroupContext) {
    const uInt8ArrayDecoder: D.Decoder<unknown, Uint8Array> = pipe(
      D.string,
      D.parse(s => {
        const uia = hexToUint8Array(s);
        return uia === undefined
          ? D.failure(s, 'UInt8ArrayDecoder')
          : D.success(uia);
      })
    );

    const uInt8ArrayEncoder: E.Encoder<string, Uint8Array> = {
      encode: p => uint8ArrayToHex(p),
    };

    this.uInt8ArrayCodec = C.make(uInt8ArrayDecoder, uInt8ArrayEncoder);

    const uInt256Decoder: D.Decoder<unknown, UInt256> = pipe(
      uInt8ArrayDecoder,
      D.parse(uia => {
        return uia.length !== 32
          ? D.failure(uia, 'UInt256Decoder')
          : D.success(UInt256.createFromBytesRightPad(uia));
      })
    );

    const uInt256Encoder: E.Encoder<string, UInt256> = {
      encode: p => uint8ArrayToHex(p.bytes),
    };

    this.uInt256Codec = C.make(uInt256Decoder, uInt256Encoder);

    const elementModPDecoder: D.Decoder<unknown, ElementModP> = pipe(
      D.string,
      D.parse(s => {
        const n = context.createElementModPFromHex(s);
        return n === undefined
          ? D.failure(s, 'ElementModPDecoder')
          : D.success(n);
      })
    );

    const elementModPEncoder: E.Encoder<string, ElementModP> = {
      encode: p => p.toHex(),
    };

    this.elementModPCodec = C.make(elementModPDecoder, elementModPEncoder);

    const elementModQDecoder: D.Decoder<unknown, ElementModQ> = pipe(
      D.string,
      D.parse(s => {
        const n = context.createElementModQFromHex(s);
        return n === undefined
          ? D.failure(s, 'ElementModQDecoder')
          : D.success(n);
      })
    );

    const elementModQEncoder: E.Encoder<string, ElementModQ> = {
      encode: q => q.toHex(),
    };

    this.elementModQCodec = C.make(elementModQDecoder, elementModQEncoder);
    const elGamalPublicKeyDecoder: D.Decoder<unknown, ElGamalPublicKey> = pipe(
      D.struct({public_key: elementModPDecoder}),
      D.map(s => new ElGamalPublicKey(s.public_key))
    );

    const elGamalPublicKeyEncoder: E.Encoder<unknown, ElGamalPublicKey> = {
      encode: egpk => {
        return {public_key: elementModPEncoder.encode(egpk.publicKeyElement)};
      },
    };

    this.elGamalPublicKeyCodec = C.make(
      elGamalPublicKeyDecoder,
      elGamalPublicKeyEncoder
    );

    const elGamalSecretKeyDecoder: D.Decoder<unknown, ElGamalSecretKey> = pipe(
      D.struct({secret_key: elementModQDecoder}),
      D.map(s => new ElGamalSecretKey(s.secret_key))
    );

    const elGamalSecretKeyEncoder: E.Encoder<unknown, ElGamalSecretKey> = {
      encode: egpk => {
        return {secret_key: elementModQEncoder.encode(egpk.secretKeyElement)};
      },
    };

    this.elGamalSecretKeyCodec = C.make(
      elGamalSecretKeyDecoder,
      elGamalSecretKeyEncoder
    );

    const elGamalKeypairDecoder: D.Decoder<unknown, ElGamalKeypair> = pipe(
      D.struct({
        secret_key: elementModQDecoder,
        public_key: elementModPDecoder,
      }),
      D.map(
        s =>
          new ElGamalKeypair(
            new ElGamalPublicKey(s.public_key),
            new ElGamalSecretKey(s.secret_key)
          )
      )
    );

    const elGamalKeypairEncoder: E.Encoder<unknown, ElGamalKeypair> = {
      encode: egkp => {
        return {
          secret_key: elementModQEncoder.encode(egkp.secretKeyElement),
          public_key: elementModPEncoder.encode(egkp.publicKeyElement),
        };
      },
    };

    this.elGamalKeypairCodec = C.make(
      elGamalKeypairDecoder,
      elGamalKeypairEncoder
    );

    const elGamalCiphertextDecoder: D.Decoder<unknown, ElGamalCiphertext> =
      pipe(
        D.struct({pad: elementModPDecoder, data: elementModPDecoder}),
        D.map(s => new ElGamalCiphertext(s.pad, s.data))
      );

    const elGamalCiphertextEncoder: E.Encoder<unknown, ElGamalCiphertext> = {
      encode: egc => {
        return {
          pad: elementModPEncoder.encode(egc.pad),
          data: elementModPEncoder.encode(egc.data),
        };
      },
    };

    this.elGamalCiphertextCodec = C.make(
      elGamalCiphertextDecoder,
      elGamalCiphertextEncoder
    );

    const constantChaumPedersenProofKnownNonceDecoder: D.Decoder<
      unknown,
      ConstantChaumPedersenProofKnownNonce
    > = pipe(
      D.struct({
        a: elementModPDecoder,
        b: elementModPDecoder,
        c: elementModQDecoder,
        r: elementModQDecoder,
        plaintext: D.number,
      }),
      D.map(
        s =>
          new ConstantChaumPedersenProofKnownNonce(
            new ExpandedGenericChaumPedersenProof(s.a, s.b, s.c, s.r),
            s.plaintext
          )
      )
    );

    const constantChaumPedersenProofKnownNonceEncoder: E.Encoder<
      unknown,
      ConstantChaumPedersenProofKnownNonce
    > = {
      encode: input => {
        return {
          a: elementModPEncoder.encode(input.proof.a),
          b: elementModPEncoder.encode(input.proof.b),
          c: elementModQEncoder.encode(input.proof.c),
          r: elementModQEncoder.encode(input.proof.r),
          plaintext: input.constant,
        };
      },
    };

    this.constantChaumPedersenProofKnownNonceCodec = C.make(
      constantChaumPedersenProofKnownNonceDecoder,
      constantChaumPedersenProofKnownNonceEncoder
    );

    const constantChaumPedersenProofKnownSecretKeyDecoder: D.Decoder<
      unknown,
      ConstantChaumPedersenProofKnownSecretKey
    > = pipe(
      D.struct({
        a: elementModPDecoder,
        b: elementModPDecoder,
        c: elementModQDecoder,
        r: elementModQDecoder,
        plaintext: D.number,
      }),
      D.map(
        s =>
          new ConstantChaumPedersenProofKnownSecretKey(
            new ExpandedGenericChaumPedersenProof(s.a, s.b, s.c, s.r),
            s.plaintext
          )
      )
    );

    const constantChaumPedersenProofKnownSecretKeyEncoder: E.Encoder<
      unknown,
      ConstantChaumPedersenProofKnownSecretKey
    > = {
      encode: input => {
        return {
          a: elementModPEncoder.encode(input.proof.a),
          b: elementModPEncoder.encode(input.proof.b),
          c: elementModQEncoder.encode(input.proof.c),
          r: elementModQEncoder.encode(input.proof.r),
          plaintext: input.constant,
        };
      },
    };

    this.constantChaumPedersenProofKnownSecretKeyCodec = C.make(
      constantChaumPedersenProofKnownSecretKeyDecoder,
      constantChaumPedersenProofKnownSecretKeyEncoder
    );

    const disjunctiveChaumPedersenProofKnownNonceDecoder: D.Decoder<
      unknown,
      DisjunctiveChaumPedersenProofKnownNonce
    > = pipe(
      D.struct({
        a0: elementModPDecoder,
        b0: elementModPDecoder,
        c0: elementModQDecoder,
        r0: elementModQDecoder,
        a1: elementModPDecoder,
        b1: elementModPDecoder,
        c1: elementModQDecoder,
        r1: elementModQDecoder,
        c: elementModQDecoder,
      }),
      D.map(
        s =>
          new DisjunctiveChaumPedersenProofKnownNonce(
            new ExpandedGenericChaumPedersenProof(s.a0, s.b0, s.c0, s.r0),
            new ExpandedGenericChaumPedersenProof(s.a1, s.b1, s.c1, s.r1),
            s.c
          )
      )
    );

    const disjunctiveChaumPedersenProofKnownNonceEncoder: E.Encoder<
      unknown,
      DisjunctiveChaumPedersenProofKnownNonce
    > = {
      encode: input => {
        return {
          a0: elementModPEncoder.encode(input.proof0.a),
          b0: elementModPEncoder.encode(input.proof0.b),
          c0: elementModQEncoder.encode(input.proof0.c),
          r0: elementModQEncoder.encode(input.proof0.r),
          a1: elementModPEncoder.encode(input.proof1.a),
          b1: elementModPEncoder.encode(input.proof1.b),
          c1: elementModQEncoder.encode(input.proof1.c),
          r1: elementModQEncoder.encode(input.proof1.r),
          c: elementModQEncoder.encode(input.c),
        };
      },
    };

    this.disjunctiveChaumPedersenProofKnownNonceCodec = C.make(
      disjunctiveChaumPedersenProofKnownNonceDecoder,
      disjunctiveChaumPedersenProofKnownNonceEncoder
    );

    const hashedElGamalCiphertextDecoder: D.Decoder<
      unknown,
      HashedElGamalCiphertext
    > = pipe(
      D.struct({
        c0: elementModPDecoder,
        c1: uInt8ArrayDecoder,
        c2: uInt256Decoder,
        numBytes: D.number,
      }),
      D.map(s => {
        return new HashedElGamalCiphertext(s.c0, s.c1, s.c2, s.numBytes);
      })
    );

    // readonly c0: ElementModP,
    // readonly c1: Uint8Array,
    // readonly c2: UInt256,
    // readonly numBytes: number

    const hashedElGamalCiphertextEncoder: E.Encoder<
      unknown,
      HashedElGamalCiphertext
    > = {
      encode: input => {
        return {
          c0: elementModPEncoder.encode(input.c0),
          c1: uInt8ArrayEncoder.encode(input.c1),
          c2: uInt256Encoder.encode(input.c2),
          numBytes: input.numBytes,
        };
      },
    };

    this.hashedElGamalCiphertextCodec = C.make(
      hashedElGamalCiphertextDecoder,
      hashedElGamalCiphertextEncoder
    );
  }
}

const codecs = new Map<string, Codecs>();

export function getCodecsForContext(context: GroupContext): Codecs {
  let result = codecs.get(context.name);
  if (result === undefined) {
    result = new Codecs(context);
    codecs.set(context.name, new Codecs(context));
  }
  return result;
}
