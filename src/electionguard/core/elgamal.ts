import {
  compatibleContextOrFail,
  divP,
  dLogG,
  Element,
  ElementModP,
  ElementModQ,
  GroupContext,
  multInvP,
  multP,
  powP,
} from './group-common';
import {CryptoHashableElement, hashElements} from './hash';

/** An ElGamal public key, suitable for encryption. */
export class ElGamalPublicKey implements CryptoHashableElement {
  readonly element: ElementModP;
  readonly inverseKey: ElementModP;

  constructor(e: ElementModP) {
    // The public key is frequently used as the base for exponentiation, so
    // we want to do the PowRadix acceleration for it.
    this.element = e.acceleratePow();
    this.inverseKey = multInvP(e); // not accelerated because not used for pow
  }

  get cryptoHashElement(): Element {
    return this.element;
  }

  /**
   * Helper method; works here and on {@link ElGamalKeypair}, always gives the
   * public key.
   */
  get publicKeyVal(): ElGamalPublicKey {
    return this;
  }

  /**
   * Helper method; works here and on {@link ElGamalKeypair}, always gives the
   * public key {@link ElementModP}.
   */
  get publicKeyElement(): ElementModP {
    return this.element;
  }

  /**
   * Helper method; works here and on {@link ElGamalKeypair}, always gives the
   * multiplicative inverse of the public key {@link ElementModP}. (Only computed
   * once, so it can be reused efficiently.)
   */
  get inversePublicKeyElement(): ElementModP {
    return this.inverseKey;
  }

  equals(other: ElGamalPublicKey): boolean {
    return this.element.equals(other.element);
  }

  toString(): string {
    return `ElGamalPublicKey(${this.element.toString()})`;
  }
}

/** An ElGamal secret key, suitable for decryption. */
export class ElGamalSecretKey implements CryptoHashableElement {
  constructor(readonly element: ElementModQ) {}

  get cryptoHashElement(): Element {
    return this.element;
  }

  /**
   * Helper method; works here and on {@link ElGamalKeypair}, always gives the
   * secret key {@link ElementModQ}.
   */
  get secretKeyElement(): ElementModQ {
    return this.element;
  }

  equals(other: ElGamalSecretKey): boolean {
    return this.element.equals(other.element);
  }

  toString(): string {
    return `ElGamalSecretKey(${this.element.toString()})`;
  }
}

/** A tuple of an ElGamal public and secret key. */
export class ElGamalKeypair {
  constructor(
    readonly publicKey: ElGamalPublicKey,
    readonly secretKey: ElGamalSecretKey
  ) {}

  /** Given an {@link ElementModQ} to be the secret key, creates a keypair. */
  static createFromSecret(secretKey: ElementModQ): ElGamalKeypair {
    const context = secretKey.context;
    if (secretKey.lessThan(context.TWO_MOD_Q))
      throw new Error('ElGamal requires the secret key to be at least two');
    else
      return new ElGamalKeypair(
        new ElGamalPublicKey(context.gPowP(secretKey)),
        new ElGamalSecretKey(secretKey)
      );
  }

  /** Creates a fresh keypair using a strong, random value. */
  static createRandom(context: GroupContext): ElGamalKeypair {
    return ElGamalKeypair.createFromSecret(context.randQ(2));
  }

  /**
   * Helper method; works here and on {@link ElGamalKeypair}, always gives the
   * public key.
   */
  get publicKeyVal(): ElGamalPublicKey {
    return this.publicKey;
  }

  /**
   * Helper method; works here and on {@link ElGamalPublicKey}, always gives the
   * public key {@link ElementModP}.
   */
  get publicKeyElement(): ElementModP {
    return this.publicKey.element;
  }

  /**
   * Helper method; works here and on {@link ElGamalPublicKey}, always gives the
   * multiplicative inverse of the public key {@link ElementModP}. (Only computed
   * once, so it can be reused efficiently.)
   */
  get inversePublicKeyElement(): ElementModP {
    return this.publicKey.inverseKey;
  }

  /**
   * Helper method; works here and on {@link ElGamalSecretKey}, always gives the
   * secret key {@link ElementModQ}.
   */
  get secretKeyElement(): ElementModQ {
    return this.secretKey.element;
  }

  equals(other: ElGamalKeypair): boolean {
    return (
      this.publicKey.equals(other.publicKey) &&
      this.secretKey.equals(other.secretKey)
    );
  }

  toString(): string {
    return `ElGamalKeypair(${this.publicKey.toString()}, ${this.secretKey.toString()})`;
  }
}

/** An encrypted message (using exponential ElGamal encryption). */
export class ElGamalCiphertext implements CryptoHashableElement {
  constructor(readonly pad: ElementModP, readonly data: ElementModP) {}

  get cryptoHashElement(): Element {
    return hashElements(this.pad.context, this.pad, this.data);
  }

  toString(): string {
    return `ElGamalCiphertext(${this.pad.toString()}, ${this.data.toString()})`;
  }

  equals(other: ElGamalCiphertext): boolean {
    return this.pad.equals(other.pad) && this.data.equals(other.data);
  }

  /** Given knowledge of the secret key, decryption is possible. */
  decrypt(secretKey: ElGamalSecretKey | ElGamalKeypair): number | undefined {
    const blind = powP(this.pad, secretKey.secretKeyElement);
    const encoded = divP(this.data, blind);
    return dLogG(encoded);
  }

  /** Given knowledge of only the public key, decryption requires knowing the nonce. */
  decryptWithNonce(
    publicKey: ElGamalPublicKey | ElGamalKeypair,
    nonce: ElementModQ
  ): number | undefined {
    const blind = powP(publicKey.publicKeyElement, nonce);
    const encoded = divP(this.data, blind);
    return dLogG(encoded);
  }

  /**
   * Checks whether the components of this ciphertext are valid residues, i.e., whether
   * they are part of the subgroup of P.
   */
  isValidResidue(): boolean {
    return this.pad.isValidResidue() && this.data.isValidResidue();
  }
}

/** Encrypt the message using "exponential" ElGamal encryption. Note that the nonce cannot be 0 or 1. */
export function elGamalEncrypt(
  publicKey: ElGamalPublicKey | ElGamalKeypair,
  data: number,
  nonce?: ElementModQ
): ElGamalCiphertext {
  let context: GroupContext;

  if (nonce === undefined) {
    context = publicKey.publicKeyElement.context;
    nonce = context.randQ(2);
  } else {
    context = compatibleContextOrFail(publicKey.publicKeyElement, nonce);
    if (nonce.lessThan(context.TWO_MOD_Q)) {
      throw new Error('encryption nonces cannot be zero or one');
    }
  }

  if (data < 0) {
    throw new Error('Cannot encrypt negative numbers');
  }

  if (!Number.isInteger(data)) {
    throw new Error('Cannot encrypt non-integer numbers');
  }

  const pk = publicKey.publicKeyElement;
  const cipherPad = context.gPowP(nonce);
  const cipherData = multP(context.gPowP(data), powP(pk, nonce));

  return new ElGamalCiphertext(cipherPad, cipherData);
}

/** Homomorphically adds the ciphertexts. */
export function elGamalAdd(
  ...ciphertexts: ElGamalCiphertext[]
): ElGamalCiphertext {
  if (ciphertexts.length === 0) {
    throw Error('Must provide at least one ciphertext');
  }

  return ciphertexts.slice(1).reduce((acc, ciphertext) => {
    return new ElGamalCiphertext(
      multP(acc.pad, ciphertext.pad),
      multP(acc.data, ciphertext.data)
    );
  }, ciphertexts[0]);
}
