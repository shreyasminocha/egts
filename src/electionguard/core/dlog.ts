// support for computing discrete logs, with a cache so they're never recomputed
import {ElementModP, multP, GroupContext} from './group-common';
import * as log from './logging';

// We're keeping this relatively small because we're not really using
// dLog in production for ElectionGuard-TypeScript. All that we're
// really required to do is encryption, so dLog is really just for
// making our unit tests validate our encryption. And the biggest
// ElGamal tests we've got aren't going above 1000.
const MAX_DLOG = 3000;

/** Wrapper for discrete log computations around a given base. */
export class DLogger {
  private dlogCache: Map<bigint, number>;
  private dlogMaxElem: ElementModP;
  private dlogMaxExp = 0;
  private context: GroupContext;

  constructor(readonly base: ElementModP) {
    this.context = base.context;
    this.dlogCache = new Map([[BigInt(1), 0]]);
    this.dlogMaxElem = this.context.ONE_MOD_P;
  }

  /**
   * Computes the discrete log, with the given base, of the
   * requested value. Only works for relatively small exponents.
   * If it can't find an answer, it returns undefined.
   */
  dLog(input: ElementModP): number | undefined {
    // Note: no locking going on here because JavaScript is
    // a single-threaded runtime. If we're running this on
    // a webworker, it's going to have its own memory.

    // Also, JavaScript isn't smart enough to let us use our
    // ElementModP values as the keys in the hash lookup. Switching
    // to bigint makes everything work as expected.

    const inputBigint = input.toBigint();
    if (this.dlogCache.has(inputBigint)) {
      return this.dlogCache.get(inputBigint);
    }

    while (!input.equals(this.dlogMaxElem)) {
      if (this.dlogMaxExp++ > MAX_DLOG) {
        log.warn('dLog', 'max dlog reached, could not decode input');
        return undefined;
      } else {
        this.dlogMaxElem = multP(this.dlogMaxElem, this.base);
        this.dlogCache.set(this.dlogMaxElem.toBigint(), this.dlogMaxExp);
      }
    }
    return this.dlogMaxExp;
  }
}
