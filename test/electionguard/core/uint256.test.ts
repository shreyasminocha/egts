import * as fc from 'fast-check';
import {
  GroupContext,
  bigIntContext3072,
  UInt256,
} from '../../../src/electionguard';
import {elementModQ, uInt256} from './generators';

function testUInt256(context: GroupContext) {
  describe(`${context.name}: UInt256 basics`, () => {
    test('xor', () => {
      fc.assert(
        fc.property(uInt256(), uInt256(), (a, b) => {
          const axbxb = a.xor(b).xor(b);
          expect(axbxb).toEqual(a);
        })
      );
    });

    test('modq conversion', () => {
      fc.assert(
        fc.property(elementModQ(context), e => {
          const ue = e.toUInt256();
          expect(ue.toElementModQ(context)).toEqual(e);
        })
      );
    });

    test('padding', () => {
      const byteRamp20 = new Uint8Array(20);
      for (let i = 0; i < 20; i++) {
        byteRamp20[i] = i;
      }
      const byteRamp32LeftZeros = new Uint8Array(32);
      const byteRamp32RightZeros = new Uint8Array(32);
      for (let i = 0; i < 20; i++) {
        byteRamp32LeftZeros[i + 12] = byteRamp20[i];
        byteRamp32RightZeros[i] = byteRamp20[i];
      }

      expect(UInt256.createFromBytesRightPad(byteRamp20).bytes).toEqual(
        byteRamp32RightZeros
      );

      expect(UInt256.createFromBytesLeftPad(byteRamp20).bytes).toEqual(
        byteRamp32LeftZeros
      );
    });
  });
}

testUInt256(bigIntContext3072());
