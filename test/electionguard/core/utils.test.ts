import * as fc from 'fast-check';
import {
  bigIntToUint8Array,
  maxOf,
  uint8ArrayToBigInt,
  arraysEqual,
  stringSetsEqual,
  associateBy,
  numberRange,
  shuffleArray,
  undefinedToNull,
  nullToUndefined,
  dateToISOString,
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
  test('arraysEqual', () => {
    expect(arraysEqual(undefined, undefined)).toBe(true);
    expect(arraysEqual(undefined, [])).toBe(false);
    expect(arraysEqual([], undefined)).toBe(false);

    fc.assert(
      fc.property(fc.array(fc.nat()), arr => {
        const dup = Array.from(arr);
        expect(arraysEqual(arr, dup)).toBe(true);
      })
    );
  });
  test('stringSetsEqual', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), arr => {
        expect(stringSetsEqual(arr, arr)).toBe(true);
        expect(stringSetsEqual(arr, Array.from(arr))).toBe(true);
        expect(stringSetsEqual(arr, shuffleArray(arr))).toBe(true);
        expect(stringSetsEqual(arr, Array.from(new Set(arr).values()))).toBe(
          true
        );
      })
    );
  });
  test('associateBy', () => {
    fc.assert(
      // the "unique" in "uniqueArray" is important
      fc.property(fc.uniqueArray(fc.string()), arr => {
        const objs = arr.map(e => ({key: e}));
        const map = associateBy(objs, e => e.key);
        arr.forEach(e => {
          expect(map.get(e)).toStrictEqual({key: e});
        });
      })
    );
  });
  test('numberRange', () => {
    fc.assert(
      fc.property(
        fc.integer({min: -10_000, max: 10_000}),
        fc.integer({min: -10_000, max: 10_000}),
        fc.integer({min: 1, max: 500}),
        (start, end, del) => {
          expect(numberRange(start, end, del)).toStrictEqual(
            numberRange(end, start, del)
          );
          expect(numberRange(start, end).length).toBe(
            Math.max(start, end) - Math.min(start, end) + 1
          );
          expect(() => {
            numberRange(start, end, 0);
          }).toThrow();
          expect(() => {
            numberRange(start, end, -del);
          }).toThrow();
        }
      )
    );
  });
  test('shuffleArray', () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), arr => {
        const shuffled = shuffleArray(arr);
        expect(shuffled.length).toStrictEqual(arr.length);
        expect(new Set(shuffled)).toStrictEqual(new Set(arr));
      })
    );
  });
  test('undefinedToNull', () => {
    fc.assert(
      fc.property(fc.option(fc.anything()), x => {
        expect(undefinedToNull(x)).toStrictEqual(x === undefined ? null : x);
      })
    );
  });
  test('nullToUndefined', () => {
    fc.assert(
      fc.property(fc.option(fc.anything()), x => {
        expect(nullToUndefined(x)).toStrictEqual(x === null ? undefined : x);
      })
    );
  });
  test('dateToISOString', () => {
    fc.assert(
      fc.property(
        fc.date({min: new Date('0000-01-01'), max: new Date('10000-01-01')}),
        fc.integer(0, 999),
        (date, milliseconds) => {
          const copy = new Date(date);
          copy.setMilliseconds(milliseconds),
            expect(dateToISOString(date)).toBe(dateToISOString(copy));
        }
      )
    );
  });
});
