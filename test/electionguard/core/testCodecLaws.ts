import * as fc from 'fast-check';
import * as C from 'io-ts/Codec';
import * as Either from 'fp-ts/lib/Either';
import {eitherRightOrFail} from '../../../src/electionguard';
import * as log from '../../../src/electionguard/core/logging';
import {fcFastConfig} from './generators';

/** Evaluates any codec and generator for correctness. */
export function testCodecLaws<T>(
  contextName: string,
  typeName: string,
  generator: fc.Arbitrary<T>,
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
            log.warn(
              'testCodecLaws',
              `deserialization failure for ${typeName}`
            );
          }

          const unpacked = eitherRightOrFail(deserialized);
          expect(equality(value, unpacked)).toBe(true);

          // now we'll make sure we can go to strings and back
          let serializedStr;
          try {
            serializedStr = JSON.stringify(serialized);
          } catch (e: unknown) {
            log.warn(
              'testCodecLaws',
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
