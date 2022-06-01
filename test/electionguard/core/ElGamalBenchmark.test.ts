import {
  ElGamalKeypair,
  ElGamalCiphertext,
  elGamalEncrypt,
} from '../../../src/electionguard/core/elgamal';
import {bigIntContext4096} from '../../../src/electionguard/core/group-bigint';
import {GroupContext} from '../../../src/electionguard/core/group-common';

function measureTimeMillis(f: () => void): number {
  const start = Date.now();
  f();
  const end = Date.now();
  return end - start;
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

/**
 * A simple benchmark that just measures how fast ElGamal encryption runs
 */
function benchmarkElGamal(context: GroupContext) {
  describe(`${context.name}: BenchmarkElgamal`, () => {
    test.skip('test_elgamal_vanilla', () => {
      const N = 10;

      console.log('Initializing benchmark for no acceleration.');
      const max = 1000;
      const min = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const messages = Array.from({length: max}, () => getRandomInt(min, max));
      const keypair = ElGamalKeypair.createRandom(context);
      const nonce = context.randQ();

      console.log('Running!');
      console.log(messages);
      const ciphertexts: ElGamalCiphertext[] = [];
      const encryptionTimeMs = measureTimeMillis(() => {
        messages.forEach(message =>
          ciphertexts.push(elGamalEncrypt(keypair, message, nonce))
        );
      });
      const encryptionTime = encryptionTimeMs / 1000.0;
      type plaintextType = number | undefined;
      const plaintexts: plaintextType[] = [];
      const decryptionTimeMs = measureTimeMillis(() => {
        ciphertexts.forEach(ciphertext =>
          plaintexts.push(ciphertext.decrypt(keypair))
        );
      });
      const decryptionTime = decryptionTimeMs / 1000.0;
      console.log(
        `ElGamal ${N / encryptionTime} encryptions/sec, ${
          N / decryptionTime
        } decryptions/sec`
      );

      expect(plaintexts).toEqual(messages);
    });
  });
}

benchmarkElGamal(bigIntContext4096());
