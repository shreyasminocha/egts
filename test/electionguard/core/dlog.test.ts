import * as fc from 'fast-check';
import {
  GroupContext,
  bigIntContext3072,
  bigIntContext4096,
} from '../../../src/electionguard';
import {fcFastConfig} from './generators';

function testDLog(context: GroupContext) {
  describe(`${context.name}: DLog properties`, () => {
    test('basic roundtrip', () => {
      fc.assert(
        fc.property(fc.nat(1000), x => {
          const exp = context.gPowP(x);
          const andBack = context.dLogG(exp);
          expect(andBack).toEqual(x);
        }),
        fcFastConfig
      );
    });
  });
}

testDLog(bigIntContext4096());
testDLog(bigIntContext3072());
