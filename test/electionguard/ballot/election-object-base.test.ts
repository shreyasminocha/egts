import * as fc from 'fast-check';
import {
  ElectionObjectBase,
  matchingArraysOfAnyElectionObjects,
  sortedArrayOfAnyElectionObjects,
} from '../../../src/electionguard/ballot/election-object-base';

class TestElectionObject implements ElectionObjectBase {
  constructor(readonly objectId: string) {}

  equals(other: ElectionObjectBase): boolean {
    return (
      other instanceof TestElectionObject && other.objectId === this.objectId
    );
  }
}

function isSorted(a: string[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (a[i - 1].localeCompare(a[i]) > 0) {
      return false;
    }
  }
  return true;
}

describe('ElectionObjectBase: basics', () => {
  test('array contents equality', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestElectionObject[] =
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          strArray.map((s, _i, _a) => new TestElectionObject(s));

        // identical values, but different objects
        const testObjects2: TestElectionObject[] =
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          strArray.map((s, _i, _a) => new TestElectionObject(s));

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
  });
  test('sorting by objectId', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), strArray => {
        const testObjects: TestElectionObject[] =
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          strArray.map((s, _i, _a) => new TestElectionObject(s));

        const sortedTestObjects = sortedArrayOfAnyElectionObjects(testObjects);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const objectIds = sortedTestObjects.map((v, i, a) => v.objectId);
        expect(isSorted(objectIds)).toBe(true);

        testObjects.reverse();
        const sortedTestObjects2 = sortedArrayOfAnyElectionObjects(testObjects);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const objectIds2 = sortedTestObjects2.map((v, i, a) => v.objectId);
        expect(isSorted(objectIds2)).toBe(true);
      })
    );
  });
});
