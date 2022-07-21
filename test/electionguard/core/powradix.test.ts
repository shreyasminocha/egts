import * as fc from 'fast-check';
import {
  GroupContext,
  bigIntContext3072,
  bigIntContext4096,
} from '../../../src/electionguard';
import {
  multInvP,
  negateQ,
  powP,
} from '../../../src/electionguard/core/group-common';
import {elementModQToLittleEndianBytes} from '../../../src/electionguard/core/powradix';
import {
  arraysEqual,
  uint8ArrayToBigInt,
} from '../../../src/electionguard/core/utils';
import {elementModQ, fcFastConfig} from './generators';

function testPowRadix(context: GroupContext) {
  describe(`${context.name}: bitslicing`, () => {
    test('super basics', () => {
      const q258 = context.createElementModQ(258) || fail();
      const bytes = q258.toBytes();

      // validate it's big-endian
      expect(bytes[bytes.length - 2]).toEqual(1);
      expect(bytes[bytes.length - 1]).toEqual(2);

      const leBytes = elementModQToLittleEndianBytes(q258);

      expect(leBytes[0]).toEqual(2);
      expect(leBytes[1]).toEqual(1);
      expect(leBytes[2]).toEqual(0);
    });

    test('increasing order', () => {
      // most significant bits are at testBytes[0], which will start off with value
      // one and then increase on our way through the array

      const testBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        testBytes[i] = i + 1;
      }

      const expectedBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        expectedBytes[i] = 32 - i;
      }

      const elem =
        context.createElementModQ(uint8ArrayToBigInt(testBytes)) || fail();

      const leBytes = elementModQToLittleEndianBytes(elem);

      const success = arraysEqual(expectedBytes, leBytes);
      expect(success).toEqual(true);
    });
  });

  describe(`${context.name}: correctness`, () => {
    test('accelerated generator equivalent to vanilla', () => {
      fc.assert(
        fc.property(elementModQ(context), x => {
          const gxAccel = context.gPowP(x);
          const vanillaG = context.createElementModP(context.G) || fail();
          const gxVanilla = powP(vanillaG, x);
          expect(gxAccel).toEqual(gxVanilla);
        }),
        fcFastConfig
      );
    });

    test('multiplicative inverses work', () => {
      fc.assert(
        fc.property(elementModQ(context), x => {
          const negativeX = negateQ(x);
          const vanillaG = context.createElementModP(context.G) || fail();
          const gxVanilla = powP(vanillaG, x);
          const gxInvVanilla = powP(vanillaG, negativeX);
          expect(multInvP(gxVanilla)).toEqual(gxInvVanilla);

          const gxAccel = context.gPowP(x);
          expect(gxAccel).toEqual(gxVanilla);
          const gxInvAccel = context.gPowP(negativeX);
          expect(gxInvAccel).toEqual(gxInvVanilla);
          expect(multInvP(gxAccel)).toEqual(gxInvAccel);
        }),
        fcFastConfig
      );
    });
  });
}

testPowRadix(bigIntContext4096());
testPowRadix(bigIntContext3072());
