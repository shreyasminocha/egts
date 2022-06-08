// source for useful functions to and from uint8Array:
// https://coolaj86.com/articles/convert-js-bigints-to-typedarrays/

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

/** Checks that the two arrays contain the same set of strings, regardless of order. */
export function stringSetsEqual(a: Array<string>, b: Array<string>): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const a of setA) if (!setB.has(a)) return false;
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
export function stringToUtf8(str: string): Uint8Array {
  // Adapted from:
  // https://stackoverflow.com/a/28227607

  // We're not doing this often enough to be too worried about speed.

  const out = [];
  let p = 0;
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      out[p++] = c;
    } else if (c < 2048) {
      out[p++] = (c >> 6) | 192;
      out[p++] = (c & 63) | 128;
    } else if (
      (c & 0xfc00) === 0xd800 &&
      i + 1 < str.length &&
      (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00
    ) {
      // Surrogate Pair
      c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
      out[p++] = (c >> 18) | 240;
      out[p++] = ((c >> 12) & 63) | 128;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    } else {
      out[p++] = (c >> 12) | 224;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    }
  }

  const result = new Uint8Array(out.length);
  for (let j = 0; j < out.length; j++) {
    result[j] = out[j];
  }
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

/**
 * Finds the element of the input that maximizes the result of the lambda when
 * applied to it. Empty array causes an error to be thrown.
 */
export function maxOf<T>(input: Array<T>, maxFn: (element: T) => number): T {
  if (input.length === 0) {
    throw new Error('maxOf only defined for non-empty input arrays');
  } else {
    let prevMax = input[0];
    let prevMaxVal = maxFn(prevMax);

    input.slice(1).forEach(v => {
      const maybeNewMaxVal = maxFn(v);
      if (maybeNewMaxVal > prevMaxVal) {
        prevMaxVal = maybeNewMaxVal;
        prevMax = v;
      }
    });

    return prevMax;
  }
}

/**
 * Given an array of elements, produces a mapping from a string to each of
 * those elements, with the strings computed by the given lambda.
 */
export function associateBy<T>(
  input: Array<T>,
  keyFn: (element: T) => string
): Map<string, T> {
  const result = new Map<string, T>();
  input.forEach(v => {
    result.set(keyFn(v), v);
  });
  return result;
}

/**
 * Creates an array of numbers in the requested range, suitable for
 * a variety of tasks. Starts at start and goes to end, inclusive.
 */
export function numberRange(start: number, end: number, delta = 1): number[] {
  const result = new Array<number>();
  let current = start;
  if (end < start) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  while (current >= start && current <= end) {
    result.push(current);
    current += delta;
  }

  return result;
}

/**
 * Given an array of any type, builds a map from string to anything.
 * @param input Arbitrary array of type T.
 * @param keyFn Function from T to string (the key of the resulting map)
 * @param valueFn Function from T to R (the value of the resulting map)
 * @returns a map from string to R
 */
export function mapFrom<T, R>(
  input: Array<T>,
  keyFn: (input: T) => string,
  valueFn: (input: T) => R
): Map<string, R> {
  const result = new Map<string, R>();
  input.forEach(i => {
    const key = keyFn(i);
    const value = valueFn(i);
    result.set(key, value);
  });
  return result;
}

/**
 * Given a map and a key, returns the value in the map corresponding
 * to the key. If it's missing, an Error is thrown with the optional
 * error string included. DON'T USE UNLESS ERRORS INDICATE CODE BUGS.
 * As in, only use when you really know the key is present and you
 * just don't NEED to deal with error handling.
 */
export function getOrFail<T>(
  map: Map<string, T>,
  key: string,
  err = 'missing key'
): T {
  const result = map.get(key);
  if (result === undefined) {
    throw new Error(err);
  } else {
    return result;
  }
}
