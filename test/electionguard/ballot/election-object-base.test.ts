import * as fc from 'fast-check';
import {
  ElectionObjectBase,
  OrderedObjectBase,
} from '../../../src/electionguard';
import {
  matchingArraysOfAnyElectionObjects,
  sortedArrayOfAnyElectionObjects,
  matchingArraysOfOrderedElectionObjects,
  sortedArrayOfOrderedElectionObjects,
} from '../../../src/electionguard/ballot/election-object-base';

class TestElectionObject implements ElectionObjectBase {
  constructor(readonly objectId: string) {}

  equals(other: ElectionObjectBase): boolean {
    return (
      other instanceof TestElectionObject && other.objectId === this.objectId
    );
  }
}

class TestOrderedObject implements OrderedObjectBase {
  constructor(readonly objectId: string, readonly sequenceOrder: number) {}

  equals(other: OrderedObjectBase): boolean {
    return (
      other instanceof TestOrderedObject &&
      other.objectId === this.objectId &&
      other.sequenceOrder === this.sequenceOrder
    );
  }
}

function isSorted<T>(a: T[], compare: (a: T, b: T) => boolean): boolean {
  for (let i = 1; i < a.length; i++) {
    if (!compare(a[i - 1], a[i])) {
      return false;
    }
  }
  return true;
}

describe('ElectionObjectBase: basics', () => {
  test('array contents equality', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestElectionObject[] = strArray.map(
          s => new TestElectionObject(s)
        );

        // identical values, but different objects
        const testObjects2: TestElectionObject[] = strArray.map(
          s => new TestElectionObject(s)
        );

        expect(
          matchingArraysOfAnyElectionObjects(testObjects, testObjects2)
        ).toBe(true);

        testObjects2.reverse(); // mutates

        const matches = matchingArraysOfAnyElectionObjects(
          testObjects,
          testObjects2
        );

        expect(matches).toBe(true);
      })
    );

    expect(
      matchingArraysOfAnyElectionObjects(
        ['a', 'b', 'c'].map(s => new TestElectionObject(s)),
        ['d', 'e', 'f'].map(s => new TestElectionObject(s))
      )
    ).toBe(false);
    expect(
      matchingArraysOfAnyElectionObjects(
        ['a', 'b', 'c'].map(s => new TestElectionObject(s)),
        ['a', 'b'].map(s => new TestElectionObject(s))
      )
    ).toBe(false);
  });
  test('sorting by objectId', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestElectionObject[] = strArray.map(
          s => new TestElectionObject(s)
        );

        const sortedTestObjects = sortedArrayOfAnyElectionObjects(testObjects);

        const objectIds = sortedTestObjects.map(v => v.objectId);
        expect(isSorted(objectIds, (a, b) => a.localeCompare(b) <= 0)).toBe(
          true
        );

        testObjects.reverse();
        const sortedTestObjects2 = sortedArrayOfAnyElectionObjects(testObjects);

        const objectIds2 = sortedTestObjects2.map(v => v.objectId);
        expect(isSorted(objectIds2, (a, b) => a.localeCompare(b) <= 0)).toBe(
          true
        );
      })
    );
  });
});

describe('OrderedObjectBase: basics', () => {
  test('array contents equality', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestOrderedObject[] = strArray.map(
          (s, i) => new TestOrderedObject(s, i)
        );

        // identical values, but different objects
        const testObjects2: TestOrderedObject[] = strArray.map(
          (s, i) => new TestOrderedObject(s, i)
        );

        expect(
          matchingArraysOfOrderedElectionObjects(testObjects, testObjects2)
        ).toBe(true);

        testObjects2.reverse(); // mutates

        const matches = matchingArraysOfOrderedElectionObjects(
          testObjects,
          testObjects2
        );

        expect(matches).toBe(true);
      })
    );

    expect(
      matchingArraysOfOrderedElectionObjects(
        ['a', 'b', 'c'].map((s, i) => new TestOrderedObject(s, i)),
        ['d', 'e', 'f'].map((s, i) => new TestOrderedObject(s, i))
      )
    ).toBe(false);
    expect(
      matchingArraysOfOrderedElectionObjects(
        ['a', 'b', 'c'].map((s, i) => new TestOrderedObject(s, i)),
        ['a', 'b'].map((s, i) => new TestOrderedObject(s, i))
      )
    ).toBe(false);
  });
  test('sorting by sequenceOrder', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestOrderedObject[] = strArray.map(
          (s, i) => new TestOrderedObject(s, i)
        );

        const sortedTestObjects =
          sortedArrayOfOrderedElectionObjects(testObjects);

        const sequenceOrder = sortedTestObjects.map(v => v.sequenceOrder);
        expect(isSorted(sequenceOrder, (a, b) => a <= b)).toBe(true);

        testObjects.reverse();
        const sortedTestObjects2 =
          sortedArrayOfOrderedElectionObjects(testObjects);

        const sequenceOrder2 = sortedTestObjects2.map(v => v.sequenceOrder);
        expect(isSorted(sequenceOrder2, (a, b) => a <= b)).toBe(true);
      })
    );
  });
});
