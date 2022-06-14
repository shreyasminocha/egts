import {GroupContext, Element, ElementModQ} from './group-common';
import * as crypto from 'crypto';
import {UInt256} from './uint256';

/**
 * Objects that implement this interface know how to convert themselves to a string
 * that can then be used as the input to a hash function.
 */
export interface CryptoHashableString {
  readonly cryptoHashString: string;
}

/**
 * Objects that implement this interface know how to convert themselves
 * to an {@link Element} that can then be used as the input to a hash function.
 */
export interface CryptoHashableElement {
  readonly cryptoHashElement: Element;
}

export type CryptoHashable =
  | string
  | number
  | bigint
  | undefined
  | CryptoHashableString
  | CryptoHashableElement
  | Iterable<CryptoHashable>;

/** Computes the SHA256 hash of a string or binary byte array. */
export function sha256(input: string | Uint8Array): UInt256 {
  const h = crypto.createHash('sha256');
  switch (typeof input) {
    case 'string':
      h.update(input, 'utf-8');
      break;
    default:
      h.update(input);
      break;
  }
  const result: Buffer = h.digest(); // Buffer should be compatible with Uint8Array
  return new UInt256(result);
}

/** Computes the HMAC-SHA256 hash of a string or binary byte array. */
export function hmacSha256(key: UInt256, input: string | Uint8Array): UInt256 {
  const h = crypto.createHmac('sha256', key.bytes);
  switch (typeof input) {
    case 'string':
      h.update(input, 'utf-8');
      break;
    default:
      h.update(input);
      break;
  }
  const result: Buffer = h.digest(); // Buffer should be compatible with Uint8Array
  return new UInt256(result);
}

/**
 * Hashes a list of zero or more things in the list of things we know how
 * to hash (see {@link CryptoHashable}). Returns an {@link ElementModQ},
 * which is why we need the {@link GroupContext}.
 */
export function hashElements(
  context: GroupContext,
  ...elements: CryptoHashable[]
): ElementModQ {
  // In the Kotlin version of this, where we weren't worried about matching
  // the EG 1.0 spec, we wrote this code entirely in terms of UInt256, which
  // meant that it didn't need to know anything about the GroupContxt. That
  // simplifies everything, but would break backward compatibility with the
  // existing hash function, at least for the iterable case where it needs
  // to do a recursive call.

  const hashMe: string =
    elements.length === 0
      ? 'null'
      : elements
          .map(e => {
            switch (typeof e) {
              case 'undefined':
                return 'null';
              case 'string':
                return e;
              case 'bigint':
              case 'number':
                return e?.toString(10); // base 10 in the reference code
              default:
                if ('cryptoHashString' in e) {
                  return e.cryptoHashString;
                } else if ('cryptoHashElement' in e) {
                  return e.cryptoHashElement.cryptoHashString;
                } else if (
                  Symbol.iterator in e &&
                  typeof e[Symbol.iterator] === 'function'
                ) {
                  const arrayView = Array.from(e);
                  if (arrayView.length === 0) {
                    // special-case for empty-list, for compatibility with reference code
                    return 'null';
                  } else {
                    return hashElements(context, ...arrayView).cryptoHashString;
                  }
                } else {
                  throw new Error('Unsupported / unexpected type');
                }
            }
          })
          .join('|');

  const hash = sha256(`|${hashMe}|`);
  return hash.toElementModQ(context);
}
