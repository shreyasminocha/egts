import {
  elGamalEncrypt,
  ElGamalKeypair,
  ElGamalPublicKey,
  ElGamalSecretKey,
} from './elgamal';
import {
  compatibleContextOrFail,
  ElementModP,
  ElementModQ,
  powP,
} from './group-common';
import {hashElements, hmacSha256} from './hash';
import {UInt256} from './uint256';
import {
  arraysEqual,
  numberToBytes,
  stringToUtf8,
  uint8ArrayChunked,
  uint8ArrayConcat,
} from './utils';

/**
 * The ciphertext representation of an arbitrary byte-array, encrypted with an ElGamal public key.
 */
export class HashedElGamalCiphertext {
  constructor(
    readonly c0: ElementModP,
    readonly c1: Uint8Array,
    readonly c2: UInt256,
    readonly numBytes: number
  ) {}

  /**
   * Attempts to decrypt the ciphertext using the given secret key. Returns `undefined` if
   * the decryption fails, likely from an HMAC verification failure.
   */
  decrypt(
    secretKey: ElGamalSecretKey | ElGamalKeypair,
    suppressWarnings = false
  ): Uint8Array | undefined {
    const context = compatibleContextOrFail(
      this.c0,
      secretKey.secretKeyElement
    );
    const alpha = this.c0;
    const beta = powP(this.c0, secretKey.secretKeyElement);
    const kdfKey = hashElements(context, alpha, beta).toUInt256();
    // console.log(`decrypting with KDF key: ${kdfKey.bytes}`);
    const kdf = new KDF(kdfKey, '', '', this.numBytes * 8);
    const k0 = kdf.get(0);
    // console.log(`decryption k0: ${k0.toString()}`);

    const hmacBytes = uint8ArrayConcat(this.c0.toBytes(), this.c1);

    const expectedHmac = hmacSha256(k0, hmacBytes);

    if (!expectedHmac.equals(this.c2)) {
      if (!suppressWarnings)
        console.warn(
          "HashedElGamalCiphertext decryption failure: HMAC doesn't match"
        );
      return undefined;
    }

    const ciphertextBlocks: Array<UInt256> = uint8ArrayChunked(this.c1, 32).map(
      v => UInt256.createFromBytesRightPad(v)
    );
    const plaintextBytes: Array<Uint8Array> = ciphertextBlocks.map(
      (v, i) => v.xor(kdf.get(i + 1)).bytes
    );
    const plaintext: Uint8Array = uint8ArrayConcat(...plaintextBytes);

    if (plaintext.length === this.numBytes) {
      return plaintext;
    } else {
      // Truncate trailing values, which should be zeros. No need to check, because
      // we've already validated the HMAC on the data.
      return plaintext.slice(0, this.numBytes);
    }
  }

  /**
   * Given an array of plaintext bytes, encrypts those bytes using the "hashed ElGamal" stream cipher,
   * described in the ElectionGuard specification, in section 3. The nonce may be specified to make
   * the encryption deterministic. Otherwise, it's selected at random.
   */
  static encrypt(
    key: ElGamalPublicKey | ElGamalKeypair,
    input: Uint8Array,
    nonce: ElementModQ | undefined = undefined
  ): HashedElGamalCiphertext {
    const pk = key.publicKeyVal;
    const context = pk.element.context;

    if (nonce === undefined) {
      nonce = context.randQ(2);
    } else {
      compatibleContextOrFail(pk.element, nonce);
    }

    const messageBlocks: Array<UInt256> = uint8ArrayChunked(input, 32).map(v =>
      UInt256.createFromBytesRightPad(v)
    );

    // ElectionGuard spec: (alpha, beta) = (g^R mod p, K^R mod p)
    // by encrypting a zero, we achieve exactly this
    const encryptedZero = elGamalEncrypt(pk, 0, nonce);
    const alpha = encryptedZero.pad;
    const beta = encryptedZero.data;
    const kdfKey = hashElements(context, alpha, beta).toUInt256();
    // console.log(`encrypting with KDF key: ${kdfKey.bytes}`);

    // NIST spec: the length is the size of the message in *bits*, but that's annoying
    // to use anywhere else, so we're otherwise just tracking the size in bytes.
    const kdf = new KDF(kdfKey, '', '', input.length * 8);
    const k0 = kdf.get(0);
    // console.log(`encryption k0: ${k0.toString()}`);
    const c0 = alpha.toBytes();
    const encryptedBlocks: Array<Uint8Array> = messageBlocks.map(
      (v, i) => v.xor(kdf.get(i + 1)).bytes
    );

    // messageBlocks.mapIndexed { i, p -> (p xor kdf[i + 1]).bytes }.toTypedArray()
    const c1 = uint8ArrayConcat(...encryptedBlocks);
    const c2 = hmacSha256(k0, uint8ArrayConcat(c0, c1));

    return new HashedElGamalCiphertext(alpha, c1, c2, input.length);
  }

  equals(other: HashedElGamalCiphertext): boolean {
    return (
      this.c0.equals(other.c0) &&
      arraysEqual(this.c1, other.c1) &&
      this.c2.equals(other.c2) &&
      this.numBytes === other.numBytes
    );
  }
}

/**
 * NIST 800-108-compliant key derivation function (KDF) state.
 * [See the spec](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-108.pdf),
 * section 5.1.
 *
 *  - The [key] must be 32 bytes long, suitable for use in HMAC-SHA256.
 *  - The [label] is a string that identifies the purpose for the derived keying material.
 *  - The [context] is a string containing the information related to the derived keying material.
 *    It may include identities of parties who are deriving and/or using the derived keying
 *    material.
 *  - The [length] specifies the length of the encrypted message in *bits*, not bytes.
 */
class KDF {
  private readonly labelBytes: Uint8Array;
  private readonly lengthBytes: Uint8Array;
  private readonly contextBytes: Uint8Array;
  private readonly zeroByte: Uint8Array;

  constructor(
    readonly key: UInt256,
    label: string,
    context: string,
    length: number
  ) {
    // we're going to convert the strings as UTF-8
    this.labelBytes = stringToUtf8(label);
    this.lengthBytes = numberToBytes(length);
    this.contextBytes = stringToUtf8(context);
    this.zeroByte = new Uint8Array(1);
    this.zeroByte[0] = 0;
  }

  /** Get the requested key bits from the sequence. */
  get(index: number): UInt256 {
    // NIST spec: K(i) := PRF (KI, [i] || Label || 0x00 || Context || [L])
    const input = uint8ArrayConcat(
      numberToBytes(index),
      this.labelBytes,
      this.zeroByte,
      this.contextBytes,
      this.lengthBytes
    );
    return hmacSha256(this.key, input);
  }
}
