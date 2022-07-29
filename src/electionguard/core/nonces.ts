import {ElementModQ} from './group-common';
import {CryptoHashable, hashElements} from './hash';

/**
 * Generates a sequence of random elements in [0,Q), seeded from an initial element in [0,Q). If you
 * start with the same seed, you'll get exactly the same sequence. Optional string or other types
 * supported in {@link CryptoHashable}, used as "headers", can be included alongside the seed both
 * at construction time and when asking for the next nonce. This is useful when specifying what a
 * nonce is being used for, to avoid various kinds of subtle cryptographic attacks.
 *
 * Nonce instances are iterable, so you can write something like:
 *
 * const [a, b, c] = new Nonces(seed);
 */
export class Nonces implements Iterable<ElementModQ> {
  private readonly internalSeed: ElementModQ;
  constructor(seed: ElementModQ, ...headers: CryptoHashable[]) {
    if (headers.length === 0) {
      this.internalSeed = seed;
    } else {
      this.internalSeed = hashElements(seed.context, seed, ...headers);
    }
  }

  /** Get the requested nonce from the sequence. */
  get(i: number): ElementModQ {
    return this.getWithHeaders(i);
  }

  /**
   * Get the requested nonce from the sequence, hashing the requested headers in with the result.
   * Headers can be included to optionally help specify what a nonce is being used for.
   */
  getWithHeaders(i: number, ...headers: CryptoHashable[]): ElementModQ {
    return hashElements(
      this.internalSeed.context,
      this.internalSeed,
      i,
      ...headers
    );
  }

  [Symbol.iterator](): Iterator<ElementModQ> {
    let counter = 0;
    return {
      next: (): IteratorResult<ElementModQ> => {
        return {
          done: false,
          value: this.get(counter++),
        };
      },
    };
  }
}
