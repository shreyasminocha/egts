export interface Eq<T> {
  /* Compares the other object to this one. */
  equals(other: T): boolean;
}
/**
 * A base object to derive other election objects identifiable by object_id
 */
export interface ElectionObjectBase extends Eq<ElectionObjectBase> {
  /** The object_id, should be a unique string. */
  objectId: string;
}

/**
 * A ordered base object to derive other election objects.
 */
export interface OrderedObjectBase extends ElectionObjectBase {
  /**
   * Used for ordering in a ballot to ensure various encryption primitives are deterministic.
   * The sequence order must be unique and should be representative of how the items are represented
   * on a template ballot in an external system.  The sequence order is not required to be in the order
   * in which they are displayed to a voter.  Any acceptable range of integer values may be provided.
   */
  sequenceOrder: number;
}

/** Sort an array of {@link OrderedObjectBase} in sequence order. Original is unchanged. */
export function sortedArrayOfOrderedElectionObjects<
  T extends OrderedObjectBase
>(unsorted: T[]): T[] {
  const inputCopy = Array.from(unsorted);
  return inputCopy.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

/** Sort an array of {@link ElectionObjectBase} in lexical objectId order. Original is unchanged. */
export function sortedArrayOfAnyElectionObjects<T extends ElectionObjectBase>(
  unsorted: T[]
): T[] {
  const inputCopy = Array.from(unsorted);
  return inputCopy.sort((a, b) => a.objectId.localeCompare(b.objectId));
}

/**
 * Given an array of {@link OrderedObjectBase} objects, first sorts them
 * by their sequence order, then does pairwise comparison for equality.
 * The inputs are not mutated.
 */
export function matchingArraysOfOrderedElectionObjects<
  T extends OrderedObjectBase
>(a: T[], b: T[]): boolean {
  const sortedA = sortedArrayOfOrderedElectionObjects(a);
  const sortedB = sortedArrayOfOrderedElectionObjects(b);
  if (sortedA.length !== sortedB.length) {
    return false;
  }
  for (let i = 0; i < sortedA.length; i++) {
    if (!sortedA[i].equals(sortedB[i])) {
      return false;
    }
  }
  return true;
}
/**
 * Given an array of any {@link ElectionObjectBase} objects, first sorts them
 * by their objectId strings, then does pairwise comparison for equality.
 * The inputs are not mutated.
 */
export function matchingArraysOfAnyElectionObjects<
  T extends ElectionObjectBase
>(a: T[], b: T[]): boolean {
  const sortedA = sortedArrayOfAnyElectionObjects(a);
  const sortedB = sortedArrayOfAnyElectionObjects(b);
  if (sortedA.length !== sortedB.length) {
    return false;
  }
  for (let i = 0; i < sortedA.length; i++) {
    if (!sortedA[i].equals(sortedB[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Given two arrays of a type that supports equals(), ({@link Eq}),
 * returns whether their contents are indeed equal. Arrays that might
 * include undefined are also supported.
 */
export function matchingArraysWithEquals<T extends Eq<T>>(
  a: (T | undefined)[] | undefined,
  b: (T | undefined)[] | undefined
): boolean {
  // having some fun here with union types!
  if (a === undefined && b === undefined) {
    return true;
  }

  if (a === undefined || b === undefined) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  } else {
    for (let i = 0; i < a.length; i++) {
      if (!objEqualsOrUndefEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

/** Helper function: compares objects for equality, but also deals with `undefined` values.  */
export function objEqualsOrUndefEquals<T extends Eq<T>>(
  a: T | undefined,
  b: T | undefined
): boolean {
  const aUndef = a === undefined;
  const bUndef = b === undefined;

  if (aUndef && bUndef) {
    return true;
  }

  if (aUndef || bUndef || !a.equals(b)) {
    return false;
  }

  return true;
}
