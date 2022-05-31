import * as fc from 'fast-check';
import {
  bigIntToUint8Array,
  uint8ArrayToBigInt,
} from '../../../src/electionguard/core/utils';

describe('uint8array utils', () => {
  test('basic roundtrip', () => {
    fc.assert(
      fc.property(fc.bigInt(BigInt(0), BigInt(1) << BigInt(255)), bi => {
        expect(uint8ArrayToBigInt(bigIntToUint8Array(bi))).toEqual(bi);
      })
    );
  });
});
