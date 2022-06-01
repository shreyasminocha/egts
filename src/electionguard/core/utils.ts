// source for useful functions to and from uint8Array:
// https://coolaj86.com/articles/convert-js-bigints-to-typedarrays/

import {TextEncoder} from 'util';

/** Returns upper-case hexadecimal version of the input. */
export function uint8ArrayToHex(u8: Uint8Array): string {
  const hex: Array<string> = [];

  u8.forEach(i => {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });

  return hex.join('').toUpperCase();
}

export function hexToUint8Array(input: string): Uint8Array | undefined {
  const safeChars = new RegExp('^[0123456789abcdefABCDEF]+$').test(input);
  if (safeChars && input.length % 2 === 0) {
    const output = new Uint8Array(input.length / 2);
    for (let i = 0; i < input.length; i += 2) {
      const hexChars = input[i] + input[i + 1];
      output[i / 2] = parseInt(hexChars, 16);
    }
    return output;
  } else {
    return undefined;
  }
}

/** Big-endian Uint8Array converter to intrinsic bigint. */
export function uint8ArrayToBigInt(u8: Uint8Array): bigint {
  return BigInt('0x' + uint8ArrayToHex(u8));
}

/** Intrinsic bigint to big-endian Uint8Array converter. */
export function bigIntToUint8Array(bi: bigint): Uint8Array {
  let hex: string = bi.toString(16);

  // But it still follows the old behavior of giving
  // invalid hex strings (due to missing padding),
  // but we can easily add that back
  if (hex.length % 2) {
    hex = '0' + hex;
  }

  // The byteLength will be half of the hex string length
  const len = hex.length / 2;
  const u8 = new Uint8Array(len);

  // And then we can iterate each element by one
  // and each hex segment by two
  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  // Tada!!
  return u8;
}

/** Compare two arrays of primitive types (using ===) for equality. */
export function arraysEqual<T>(
  a: Array<T> | Uint8Array | undefined,
  b: Array<T> | Uint8Array | undefined
): boolean {
  // https://stackoverflow.com/a/16436975
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Splits an array into "chunks" of the requested size. */
export function uint8ArrayChunked(
  input: Uint8Array,
  chunkSize: number
): Array<Uint8Array> {
  // https://stackoverflow.com/a/11764168
  const chunks: Array<Uint8Array> = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    chunks.push(input.slice(i, (i += chunkSize)));
  }

  return chunks;
}

/** Concatenates two Uint8Arrays to a new result. */
export function uint8ArrayConcat(...input: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (let i = 0; i < input.length; i++) {
    totalLength += input[i].length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < input.length; i++) {
    for (let j = 0; j < input[i].length; j++) {
      result[offset++] = input[i][j];
    }
  }

  return result;
}

/** Converts a string from its internal (UTF-16?) representation to UTF-8. */
export function stringToUtf8(input: string): Uint8Array {
  // https://stackoverflow.com/a/46241050
  const result = new TextEncoder().encode(input);
  return result;
}

/** Convert an unsigned number into a big-endian 4-byte array. */
export function numberToBytes(input: number): Uint8Array {
  if (input < 0) {
    throw new Error('negative numbers not supported');
  } else if (input < 4294967296) {
    const result = new Uint8Array(4);
    result[0] = input >> 24;
    result[1] = (input >> 16) & 0xff;
    result[2] = (input >> 8) & 0xff;
    result[3] = input & 0xff;
    return result;
  } else {
    throw new Error('no support for >32 bit integers');
  }
}
