import {ElementModQ, GroupContext} from './group-common';
import {CryptoHashableString} from './hash';
import {
  arraysEqual,
  bigIntToUint8Array,
  uint8ArrayToBigInt,
  uint8ArrayToHex,
} from './utils';

/**
 * Superficially similar to an {@link ElementModQ}, but guaranteed to be exactly 32 bytes long. Use with
 * care, because the internal representation allows for mutation, and the internal representation is
 * available for external use.
 */
export class UInt256 implements CryptoHashableString {
  static readonly ZERO: UInt256 = UInt256.createFrom(0);
  static readonly ONE: UInt256 = UInt256.createFrom(1);
  static readonly TWO: UInt256 = UInt256.createFrom(2);

  constructor(readonly bytes: Uint8Array) {
    if (bytes.length !== 32)
      throw new Error('UInt256 must have exactly 32 bytes');
  }

  /**
   * If the input is smaller than 32 bytes, the high-bytes will be zero. If the input is
   * greater than 32 bytes, an error is thrown.
   */
  static createFromBytesRightPad(bytesOrig: Uint8Array): UInt256 {
    if (bytesOrig.length > 32) {
      throw new Error(
        `UInt256 only has room for 32 bytes, but input was ${bytesOrig.length}`
      );
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = i < bytesOrig.length ? bytesOrig[i] : 0;
    }

    return new UInt256(bytes);
  }

  /**
   * If the input is smaller than 32 bytes, the low-bytes will be zero. If the input is
   * greater than 32 bytes, an error is thrown.
   */
  static createFromBytesLeftPad(bytesOrig: Uint8Array): UInt256 {
    if (bytesOrig.length > 32) {
      throw new Error(
        `UInt256 only has room for 32 bytes, but input was ${bytesOrig.length}`
      );
    }
    const diff = 32 - bytesOrig.length;
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = i < diff ? 0 : bytesOrig[i - diff];
    }

    return new UInt256(bytes);
  }

  /**
   * Converts the input to a bigint, then to big-endian bytes. If the result is smaller than
   * 32 bytes, the high-bytes will be zero. If the result is greater than 32 bytes, an error
   * is thrown.
   */
  static createFrom(input: number | bigint | string): UInt256 {
    return UInt256.createFromBytesLeftPad(bigIntToUint8Array(BigInt(input)));
  }

  /** Converts to base-16 big-endian upper-case hex string. */
  toHex(): string {
    return uint8ArrayToHex(this.bytes);
  }

  toString(): string {
    return `UInt256(${this.toHex()})`;
  }

  get cryptoHashString(): string {
    return this.toHex();
  }

  /** Returns whether the given value is all zeros. */
  isZero(): boolean {
    return UInt256.ZERO.equals(this);
  }

  equals(other: UInt256): boolean {
    return arraysEqual(this.bytes, other.bytes);
  }

  /** Computes the bitwise xor of all the bits. */
  xor(other: UInt256): UInt256 {
    const result = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      result[i] = this.bytes[i] ^ other.bytes[i];
    }

    return new UInt256(result);
  }

  /**
   * Safely converts a {@link UInt256} to an {@link ElementModQ}, wrapping values outside the
   * range back to the beginning by computing "mod q".
   */
  toElementModQ(context: GroupContext): ElementModQ {
    return context.createElementModQSafe(uint8ArrayToBigInt(this.bytes));
  }
}
