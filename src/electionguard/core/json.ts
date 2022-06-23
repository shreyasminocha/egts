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
import {
  EdgeCaseConfiguration,
  ElectionConstants,
  ElectionContext,
  EncryptionDevice,
} from './constants';
import {
  bigIntToUint8Array,
  hexToUint8Array,
  uint8ArrayToBigInt,
  uint8ArrayToHex,
} from './utils';
import {HashedElGamalCiphertext} from './hashed-elgamal';
import {UInt256} from './uint256';
import * as Either from 'fp-ts/lib/Either';
import * as log from './logging';

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
export class CoreCodecs {
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
  readonly electionConstantsCodec: C.Codec<unknown, unknown, ElectionConstants>;
  readonly electionContextCodec: C.Codec<unknown, unknown, ElectionContext>;
  readonly encryptionDeviceCodec: C.Codec<unknown, unknown, EncryptionDevice>;
  readonly edgeCaseConfigurationCodec: C.Codec<
    unknown,
    unknown,
    EdgeCaseConfiguration
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

    const electionConstantsDecoder: D.Decoder<unknown, ElectionConstants> =
      pipe(
        D.struct({
          large_prime: uInt8ArrayDecoder,
          small_prime: uInt8ArrayDecoder,
          cofactor: uInt8ArrayDecoder,
          generator: uInt8ArrayDecoder,
        }),
        D.withMessage((i, e) => {
          log.info('ElectionConstandsDecoder', `value: ${i}`);
          log.info('ElectionConstandsDecoder', `error: ${e}`);
          return 'Hmm';
        }),
        D.map(
          s =>
            new ElectionConstants(
              uint8ArrayToBigInt(s.large_prime),
              uint8ArrayToBigInt(s.small_prime),
              uint8ArrayToBigInt(s.cofactor),
              uint8ArrayToBigInt(s.generator)
            )
        )
      );

    const electionConstantsEncoder: E.Encoder<unknown, ElectionConstants> = {
      encode: e => {
        return {
          large_prime: uInt8ArrayEncoder.encode(
            bigIntToUint8Array(e.largePrime)
          ),
          small_prime: uInt8ArrayEncoder.encode(
            bigIntToUint8Array(e.smallPrime)
          ),
          cofactor: uInt8ArrayEncoder.encode(bigIntToUint8Array(e.cofactor)),
          generator: uInt8ArrayEncoder.encode(bigIntToUint8Array(e.generator)),
        };
      },
    };

    this.electionConstantsCodec = C.make(
      electionConstantsDecoder,
      electionConstantsEncoder
    );

    const edgeCaseConfigurationDecoder: D.Decoder<
      unknown,
      EdgeCaseConfiguration
    > = pipe(
      D.partial({
        allow_overvotes: D.boolean,
        max_votes: D.number,
      }),
      D.map(
        // default values taken from the Python code
        s =>
          new EdgeCaseConfiguration(
            s.allow_overvotes || true,
            s.max_votes || 1_000_000
          )
      )
    );

    const edgeCaseConfigurationEncoder: E.Encoder<
      unknown,
      EdgeCaseConfiguration
    > = {
      encode: e => {
        return {
          allow_overvotes: e.allowOvervotes,
          max_votes: e.maxVotes,
        };
      },
    };

    this.edgeCaseConfigurationCodec = C.make(
      edgeCaseConfigurationDecoder,
      edgeCaseConfigurationEncoder
    );

    const electionContextDecoder: D.Decoder<unknown, ElectionContext> = pipe(
      D.struct({
        number_of_guardians: D.number,
        quorum: D.number,
        elgamal_public_key: elementModPDecoder,
        manifest_hash: elementModQDecoder,
        crypto_base_hash: elementModQDecoder,
        crypto_extended_base_hash: elementModQDecoder,
        commitment_hash: elementModQDecoder,
      }),
      D.intersect(
        D.partial({
          extended_data: D.nullable(D.record(D.string)),
          configuration: D.nullable(edgeCaseConfigurationDecoder),
        })
      ),
      D.map(
        s =>
          new ElectionContext(
            s.number_of_guardians,
            s.quorum,
            new ElGamalPublicKey(s.elgamal_public_key),
            s.manifest_hash,
            s.crypto_base_hash,
            s.crypto_extended_base_hash,
            s.commitment_hash,
            // TODO: verify this is the way handle an optional record field
            s.extended_data || undefined,
            s.configuration || undefined
          )
      )
    );

    const electionContextEncoder: E.Encoder<unknown, ElectionContext> = {
      encode: e => {
        return {
          number_of_guardians: e.numberOfGuardians,
          quorum: e.quorum,
          elgamal_public_key: elementModPEncoder.encode(
            e.jointPublicKey.element
          ),
          manifest_hash: elementModQEncoder.encode(e.manifestHash),
          crypto_base_hash: elementModQEncoder.encode(e.cryptoBaseHash),
          crypto_extended_base_hash: elementModQEncoder.encode(
            e.cryptoExtendedBaseHash
          ),
          commitment_hash: elementModQEncoder.encode(e.commitmentHash),
          // TODO: verify this is the way to handle an optional record field
          extended_data: e.extendedData || null,
          configuration:
            e.configuration !== undefined
              ? edgeCaseConfigurationEncoder.encode(e.configuration)
              : undefined,
        };
      },
    };

    this.electionContextCodec = C.make(
      electionContextDecoder,
      electionContextEncoder
    );

    const encryptionDeviceDecoder: D.Decoder<unknown, EncryptionDevice> = pipe(
      D.struct({
        device_id: D.number,
        session_id: D.number,
        launch_code: D.number,
        location: D.string,
      }),
      D.map(
        s =>
          new EncryptionDevice(
            s.device_id,
            s.session_id,
            s.launch_code,
            s.location
          )
      )
    );

    const encryptionDeviceEncoder: E.Encoder<unknown, EncryptionDevice> = {
      encode: e => {
        return {
          device_id: e.deviceId,
          session_id: e.sessionId,
          launch_code: e.launchCode,
          location: e.location,
        };
      },
    };

    this.encryptionDeviceCodec = C.make(
      encryptionDeviceDecoder,
      encryptionDeviceEncoder
    );

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
        pad: elementModPDecoder,
        data: elementModPDecoder,
        challenge: elementModQDecoder,
        response: elementModQDecoder,
        constant: D.number,
      }),
      D.map(
        s =>
          new ConstantChaumPedersenProofKnownNonce(
            new ExpandedGenericChaumPedersenProof(
              s.pad,
              s.data,
              s.challenge,
              s.response
            ),
            s.constant
          )
      )
    );

    const constantChaumPedersenProofKnownNonceEncoder: E.Encoder<
      unknown,
      ConstantChaumPedersenProofKnownNonce
    > = {
      encode: input => {
        return {
          pad: elementModPEncoder.encode(input.proof.a),
          data: elementModPEncoder.encode(input.proof.b),
          challenge: elementModQEncoder.encode(input.proof.c),
          response: elementModQEncoder.encode(input.proof.r),
          constant: input.constant,
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
        pad: elementModPDecoder,
        data: elementModPDecoder,
        challenge: elementModQDecoder,
        response: elementModQDecoder,
        constant: D.number,
      }),
      D.map(
        s =>
          new ConstantChaumPedersenProofKnownSecretKey(
            new ExpandedGenericChaumPedersenProof(
              s.pad,
              s.data,
              s.challenge,
              s.response
            ),
            s.constant
          )
      )
    );

    const constantChaumPedersenProofKnownSecretKeyEncoder: E.Encoder<
      unknown,
      ConstantChaumPedersenProofKnownSecretKey
    > = {
      encode: input => {
        return {
          pad: elementModPEncoder.encode(input.proof.a),
          data: elementModPEncoder.encode(input.proof.b),
          challenge: elementModQEncoder.encode(input.proof.c),
          response: elementModQEncoder.encode(input.proof.r),
          constant: input.constant,
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
        proof_zero_pad: elementModPDecoder,
        proof_zero_data: elementModPDecoder,
        proof_zero_challenge: elementModQDecoder,
        proof_zero_response: elementModQDecoder,
        proof_one_pad: elementModPDecoder,
        proof_one_data: elementModPDecoder,
        proof_one_challenge: elementModQDecoder,
        proof_one_response: elementModQDecoder,
        challenge: elementModQDecoder,
      }),
      D.map(
        s =>
          new DisjunctiveChaumPedersenProofKnownNonce(
            new ExpandedGenericChaumPedersenProof(
              s.proof_zero_pad,
              s.proof_zero_data,
              s.proof_zero_challenge,
              s.proof_zero_response
            ),
            new ExpandedGenericChaumPedersenProof(
              s.proof_one_pad,
              s.proof_one_data,
              s.proof_one_challenge,
              s.proof_one_response
            ),
            s.challenge
          )
      )
    );

    const disjunctiveChaumPedersenProofKnownNonceEncoder: E.Encoder<
      unknown,
      DisjunctiveChaumPedersenProofKnownNonce
    > = {
      encode: input => {
        return {
          proof_zero_pad: elementModPEncoder.encode(input.proof0.a),
          proof_zero_data: elementModPEncoder.encode(input.proof0.b),
          proof_zero_challenge: elementModQEncoder.encode(input.proof0.c),
          proof_zero_response: elementModQEncoder.encode(input.proof0.r),
          proof_one_pad: elementModPEncoder.encode(input.proof1.a),
          proof_one_data: elementModPEncoder.encode(input.proof1.b),
          proof_one_challenge: elementModQEncoder.encode(input.proof1.c),
          proof_one_response: elementModQEncoder.encode(input.proof1.r),
          challenge: elementModQEncoder.encode(input.c),
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
        pad: elementModPDecoder,
        data: uInt8ArrayDecoder,
        mac: uInt256Decoder,
        numBytes: D.number,
      }),
      D.map(s => {
        return new HashedElGamalCiphertext(s.pad, s.data, s.mac, s.numBytes);
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
          pad: elementModPEncoder.encode(input.c0),
          data: uInt8ArrayEncoder.encode(input.c1),
          mac: uInt256Encoder.encode(input.c2),
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

const codecs = new Map<string, CoreCodecs>();

/** Given a context, returns all the codecs for that context.  */
export function getCoreCodecsForContext(context: GroupContext): CoreCodecs {
  let result = codecs.get(context.name);
  if (result === undefined) {
    result = new CoreCodecs(context);
    codecs.set(context.name, new CoreCodecs(context));
  }
  return result;
}

/**
 * Breaks the beautiful functional aspects of using a codec decoder and
 * either gives us the actual value or throws an error. Useful for tests
 * or when we really do want to throw an error.
 */
export function eitherRightOrFail<T>(
  input: Either.Either<D.DecodeError, T>
): T {
  if (Either.isLeft(input)) {
    throw new Error(D.draw(input.left as D.DecodeError));
  } else {
    return input.right;
  }
}
