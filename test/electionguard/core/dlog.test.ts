import * as fc from 'fast-check';
import {fcFastConfig} from './generators';
import {GroupContext} from '../../../src/electionguard/core/group-common';
import {
  bigIntContext3072,
  bigIntContext4096,
} from '../../../src/electionguard/core/group-bigint';

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
