import * as fc from 'fast-check';
import createHash from 'create-hash';
import {UInt256} from '../../../src/electionguard/core/uint256';
import {bigIntContext3072} from '../../../src/electionguard/core/group-bigint';
import {hashElements} from '../../../src/electionguard/core/hash';

const groupContext = bigIntContext3072();

const h = createHash('sha256');
h.update('|null|', 'utf-8');
const nullHash = new UInt256(h.digest()).toElementModQ(groupContext);

describe('hash', () => {
  test('no args', () => {
    expect(hashElements(groupContext).equals(nullHash)).toBe(true);
  });
  test('arrays', () => {
    expect(hashElements(groupContext, []).equals(nullHash)).toBe(true);

    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string(), fc.nat()), {minLength: 1}),
        arr => {
          expect(
            hashElements(groupContext, arr).equals(
              hashElements(groupContext, ...arr)
            )
          ).toBe(false); // the array's hash is hashed again with delimiters
        }
      )
    );
  });
  test('undefined', () => {
    expect(hashElements(groupContext, undefined).equals(nullHash)).toBe(true);
  });
  test('strings', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), {minLength: 1}), strings => {
        const h = createHash('sha256');
        h.update(`|${strings.join('|')}|`, 'utf-8');
        const expected = new UInt256(h.digest()).toElementModQ(groupContext);

        expect(hashElements(groupContext, ...strings).equals(expected)).toBe(
          true
        );
      })
    );

    const h = createHash('sha256');
    h.update('||', 'utf-8');
    const expected = new UInt256(h.digest()).toElementModQ(groupContext);
    expect(hashElements(groupContext, '').equals(expected)).toBe(true);
  });
  test('numbers', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...'0123456789'.split(''))),
        numStr => {
          const h = createHash('sha256');
          h.update(`|${numStr}|`, 'utf-8');
          const expected = new UInt256(h.digest()).toElementModQ(groupContext);
          expect(hashElements(groupContext, BigInt(numStr)).equals(expected));
        }
      )
    );
  });
  test.todo('cryptohashable');
});
