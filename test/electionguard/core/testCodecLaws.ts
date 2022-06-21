import {Arbitrary} from 'fast-check';
import * as C from 'io-ts/Codec';
import * as fc from 'fast-check';
import {fcFastConfig} from './generators';
import {eitherRightOrFail} from '../../../src/electionguard/core/json';
import {Either} from 'fp-ts/lib/Either';

/** Evaluates any codec and generator for correctness. */
export function testCodecLaws<T>(
  contextName: string,
  typeName: string,
  generator: Arbitrary<T>,
  codec: C.Codec<unknown, unknown, T>,
  equality: (a: T, b: T) => boolean
) {
  describe(`${contextName}: tests for ${typeName}`, () => {
    test('serialize / deserialize', () => {
      fc.assert(
        fc.property(generator, (value: T) => {
          if (typeName === 'ElectionType') {
            console.log('working on ElectionType')
          }
          const serialized = codec.encode(value);
          const deserialized = codec.decode(serialized);
          const unpacked = eitherRightOrFail(deserialized);
          expect(equality(value, unpacked)).toBe(true);

          // now we'll make sure we can go to strings and back
          const serializedStr = JSON.stringify(serialized);
          const backToObject = JSON.parse(serializedStr);
          const deserialized2 = codec.decode(backToObject);
          expect(equality(value, eitherRightOrFail(deserialized2))).toBe(true);
        }),
        fcFastConfig
      );
    });
  });
}
