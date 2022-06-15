import * as fc from 'fast-check';
import {
  bigIntToUint8Array,
  maxOf,
  uint8ArrayToBigInt,
} from '../../../src/electionguard/core/utils';

describe('utils', () => {
  test('uint8array basic roundtrip', () => {
    fc.assert(
      fc.property(fc.bigInt(BigInt(0), BigInt(1) << BigInt(255)), bi => {
        expect(uint8ArrayToBigInt(bigIntToUint8Array(bi))).toEqual(bi);
      })
    );
  });
  test('maxOf', () => {
    expect(maxOf(['a', 'bb', 'ccc', 'dddd', 'eeeee'], s => s.length)).toEqual(
      'eeeee'
    );
    expect(maxOf(['a', 'bbbb', 'cc', 'd', 'eee'], s => s.length)).toEqual(
      'bbbb'
    );
  });
});
