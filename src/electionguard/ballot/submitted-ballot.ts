import {
  ConstantChaumPedersenProofKnownNonce,
  DisjunctiveChaumPedersenProofKnownNonce,
} from '../core/chaum-pedersen';
import {ElGamalCiphertext} from '../core/elgamal';
import {ElementModQ} from '../core/group-common';
import {CryptoHashableElement} from '../core/hash';
import {HashedElGamalCiphertextCompat} from '../core/hashed-elgamal';
import {
  ElectionObjectBase,
  matchingArraysOfAnyElectionObjects,
} from './election-object-base';

export class SubmittedBallot
  implements CryptoHashableElement, ElectionObjectBase
{
  constructor(
    readonly ballotId: string,
    readonly ballotStyleId: string,
    readonly manifestHash: ElementModQ, // matches Manifest.cryptoHash
    readonly codeSeed: ElementModQ,
    readonly code: ElementModQ,
    readonly contests: Array<SubmittedContest>,
    readonly timestamp: number,
    readonly cryptoHash: ElementModQ,
    readonly state: BallotState
  ) {}

  get objectId(): string {
    return this.ballotId;
  }

  get cryptoHashElement(): ElementModQ {
    return this.cryptoHash;
  }

  equals(other: SubmittedBallot): boolean {
    return (
      other instanceof SubmittedBallot &&
      this.ballotId === other.ballotId &&
      this.ballotStyleId === other.ballotStyleId &&
      this.manifestHash.equals(other.manifestHash) &&
      this.codeSeed.equals(other.codeSeed) &&
      this.code.equals(other.code) &&
      matchingArraysOfAnyElectionObjects(this.contests, other.contests) &&
      this.timestamp === other.timestamp &&
      this.cryptoHash.equals(other.cryptoHash) &&
      this.state === other.state
    );
  }
}

export class SubmittedContest
  implements CryptoHashableElement, ElectionObjectBase
{
  constructor(
    readonly contestId: string, // matches ContestDescription.contestIdd
    readonly sequenceOrder: number, // matches ContestDescription.sequenceOrderv
    readonly contestHash: ElementModQ, // matches ContestDescription.cryptoHash
    readonly selections: Array<SubmittedSelection>,
    readonly ciphertextAccumulation: ElGamalCiphertext,
    readonly cryptoHash: ElementModQ,
    readonly proof: ConstantChaumPedersenProofKnownNonce,
    readonly extendedData?: HashedElGamalCiphertextCompat
  ) {}

  get objectId(): string {
    return this.contestId;
  }

  get cryptoHashElement(): ElementModQ {
    return this.cryptoHash;
  }

  equals(other: SubmittedContest): boolean {
    return (
      other instanceof SubmittedContest &&
      this.contestId === other.contestId &&
      this.sequenceOrder === other.sequenceOrder &&
      this.contestHash.equals(other.contestHash) &&
      matchingArraysOfAnyElectionObjects(this.selections, other.selections) &&
      this.ciphertextAccumulation.equals(other.ciphertextAccumulation) &&
      this.proof.equals(other.proof)
    );
    // ignoring extended data
  }
}

export class SubmittedSelection
  implements CryptoHashableElement, ElectionObjectBase
{
  constructor(
    readonly selectionId: string, // matches SelectionDescription.selectionId
    readonly sequenceOrder: number, // matches SelectionDescription.sequenceOrder
    readonly selectionHash: ElementModQ, // matches SelectionDescription.cryptoHash
    readonly ciphertext: ElGamalCiphertext,
    readonly cryptoHash: ElementModQ,
    readonly isPlaceholderSelection: boolean = false,
    readonly proof: DisjunctiveChaumPedersenProofKnownNonce
  ) {}

  get objectId(): string {
    return this.selectionId;
  }

  get cryptoHashElement(): ElementModQ {
    return this.cryptoHash;
  }

  equals(other: SubmittedSelection): boolean {
    return (
      other instanceof SubmittedSelection &&
      this.selectionId === other.selectionId &&
      this.sequenceOrder === other.sequenceOrder &&
      this.selectionHash.equals(other.selectionHash) &&
      this.ciphertext.equals(other.ciphertext) &&
      this.isPlaceholderSelection === other.isPlaceholderSelection &&
      this.proof.equals(other.proof) &&
      this.cryptoHash.equals(other.cryptoHash)
    );
  }
}

export enum BallotState {
  /** A ballot that has been explicitly cast */
  CAST,
  /** A ballot that has been explicitly spoiled */
  SPOILED,
  /** A ballot whose state is unknown to ElectionGuard and will not be included in results. */
  UNKNOWN,
}
