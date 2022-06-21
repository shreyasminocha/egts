import {Arbitrary} from 'fast-check';
import * as C from 'io-ts/Codec';
import * as fc from 'fast-check';
import {fcFastConfig} from './generators';
import {eitherRightOrFail} from '../../../src/electionguard/core/json';
import * as Either from 'fp-ts/lib/Either';

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
          const serialized = codec.encode(value);
          const deserialized = codec.decode(serialized);
          if (Either.isLeft(deserialized)) {
            console.warn(`deserialization failure for ${typeName}`);
          }

          const unpacked = eitherRightOrFail(deserialized);
          expect(equality(value, unpacked)).toBe(true);

          // now we'll make sure we can go to strings and back
          let serializedStr;
          try {
            serializedStr = JSON.stringify(serialized);
          } catch (e: any) {
            console.warn(
              `unexpected JSON stringify failure for ${typeName}: ${serialized}`
            );
            throw e;
          }

          const backToObject = JSON.parse(serializedStr);
          const deserialized2 = codec.decode(backToObject);
          expect(equality(value, eitherRightOrFail(deserialized2))).toBe(true);
        }),
        fcFastConfig
      );
    });
  });
}