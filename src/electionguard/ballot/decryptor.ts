import { Either } from 'fp-ts/lib/Either';
import {
  ConstantChaumPedersenProofKnownNonce,
  DisjunctiveChaumPedersenProofKnownNonce,
} from '../core/chaum-pedersen';
import {ElectionContext} from '../core/constants';
import {elGamalAdd, elGamalEncrypt, ElGamalKeypair, ElGamalPublicKey} from '../core/elgamal';
import {addQ, ElementModQ, GroupContext} from '../core/group-common';
import {hashElements} from '../core/hash';
import {Nonces} from '../core/nonces';
import {associateBy, maxOf, numberRange} from '../core/utils';
import {
  CiphertextBallot,
  CiphertextContest,
  CiphertextSelection,
} from './ciphertext-ballot';
import {
  Manifest,
  ManifestContestDescription,
  ManifestSelectionDescription,
} from './manifest';
import {
  PlaintextBallot,
  PlaintextContest,
  PlaintextSelection,
} from './plaintext-ballot';


/**
 * Simplified decryption support. Doesn't have any support for trustees/guardians.
 * All it can do is decrypt when the ElGamal public key and secret key are both known.
 * Very useful for testing.
 */
export class Decryptor {
  constructor(
    readonly group: GroupContext,
    readonly manifest: Manifest,
    readonly context: ElectionContext,
    readonly keypair: ElGamalKeypair
  ) {}

  decryptBallotList(
    ciphertextBallots: Array<CiphertextBallot>
  ): Array<Either<Error, PlaintextBallot>> {}
    return ciphertextBallots.map(b => this.decryptBallot(b))
  }

  decryptBallot(ciphertextBallot: CiphertextBallot): Either<Error, PlaintextBallot> {
  }
}