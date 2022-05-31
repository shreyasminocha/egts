import {GroupContext} from '../../../src/electionguard/core/group-common';
import {
  bigIntContext3072,
  bigIntContext4096,
} from '../../../src/electionguard/core/group-bigint';
import {Nonces} from '../../../src/electionguard/core/nonces';

function testNonces(context: GroupContext) {
  describe(`${context.name}: nonce tests`, () => {
    test('super basics', () => {
      const nonces = new Nonces(context.TWO_MOD_Q);
      const [n1, n2, n3] = nonces;
      expect(n1).toEqual(nonces.get(0));
      expect(n2).toEqual(nonces.get(1));
      expect(n3).toEqual(nonces.get(2));

      const nonces2 = new Nonces(context.TWO_MOD_Q);
      expect(n2).toEqual(nonces2.get(1));

      const nonces3 = new Nonces(context.TWO_MOD_Q, 'something extra');
      expect(n2).not.toEqual(nonces3.get(1));

      const nonces4 = new Nonces(context.TWO_MOD_Q, 'something extra');
      expect(nonces3.get(1)).toEqual(nonces4.get(1));
    });
  });
}

testNonces(bigIntContext3072());
testNonces(bigIntContext4096());
