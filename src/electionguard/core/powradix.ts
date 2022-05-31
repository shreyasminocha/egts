import {
  compatibleContextOrFail,
  ElementModP,
  ElementModQ,
  MontgomeryElementModP,
} from './group-common';

/**
 * PowRadix implements a table of precomputed values that allow us to accelerate
 * modular exponentation from a commonly reused base by instead breaking the
 * exponent into smaller values, looking them up in precomputed tables, and
 * multiplying them together.
 *
 * We're further accelerating this process by converting from regular {@link ElementModP}
 * values to the {@link MontgomeryElementModP} representation, which allows for
 * faster multiplies (by replacing the slow modulo operation with a faster bit-mask).
 *
 * In its most general form, we have a time-space tradeoff, where we can build larger
 * tables and then do fewer multiplies to replace each modular exponentiation. For
 * This TypeScript implementation, however, we're going with a fixed-size table
 * that's much faster to compute. Bigger precompute tables only make sense for larger
 * batch computations, which the TypeScript implementation is never meant to support.
 */
export class PowRadix {
  readonly tableLength: number;
  readonly numColumns: number;
  readonly table: Array<Array<MontgomeryElementModP>>;
  readonly montgomeryOne: MontgomeryElementModP;

  constructor(readonly basis: ElementModP) {
    const mBasis = basis.toMontgomeryElementModP();
    this.montgomeryOne = basis.context.ONE_MOD_P.toMontgomeryElementModP();
    this.tableLength = 32; // = 256 / 8
    let rowBasis = mBasis;
    let runningBasis = rowBasis;
    this.numColumns = 256; // = 2^8

    // row-major table
    this.table = new Array<Array<MontgomeryElementModP>>(this.tableLength);
    for (let rowIdx = 0; rowIdx < this.tableLength; rowIdx++) {
      const row = new Array<MontgomeryElementModP>(this.numColumns);
      for (let columnIdx = 0; columnIdx < this.numColumns; columnIdx++) {
        if (columnIdx === 0) row[0] = this.montgomeryOne;
        else {
          const finalColumn = runningBasis;
          runningBasis = runningBasis.multiply(rowBasis);
          row[columnIdx] = finalColumn;
        }
      }
      rowBasis = runningBasis;
      this.table[rowIdx] = row;
    }
  }

  /** Computes the same result as running {@link powP} with this basis and exponent. */
  powP(e: ElementModQ): ElementModP {
    compatibleContextOrFail(this.basis, e);

    const slices = elementModQToLittleEndianBytes(e);
    let y = this.montgomeryOne;
    for (let i = 0; i < 32; i++) {
      const nextProd = this.table[i][slices[i]];
      y = y.multiply(nextProd);
    }

    return y.toElementModP();
  }
}

/**
 * Starting from 32 bytes (or less) in big-endian order, or a special case
 * of 33 bytes with a leading zero, returns exactly 32 bytes, in little-endian
 * order. High-order zeros are to the right.
 */
export function elementModQToLittleEndianBytes(input: ElementModQ): Uint8Array {
  const inputBytes = input.toBytes();
  const size = inputBytes.length;
  if (size <= 32 || (size === 33 && inputBytes[0] === 0)) {
    const result = new Uint8Array(32);
    for (let target = 0; target < 32; target++) {
      const offset = 32 - target - 1;

      if (size === 32) {
        result[target] = inputBytes[offset];
      } else if (size === 33) {
        result[target] = inputBytes[offset + 1];
      } else if (offset < 32 - size) {
        result[target] = 0;
      } else {
        result[target] = inputBytes[offset - 32 + size];
      }
    }
    return result;
  } else {
    throw new Error(`unexpected input array length: ${inputBytes.length}`);
  }
}
