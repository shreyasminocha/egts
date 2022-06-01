import {
  ConstantChaumPedersenProofKnownNonce,
  DisjunctiveChaumPedersenProofKnownNonce,
} from '../core/chaum-pedersen';
import {ElGamalCiphertext} from '../core/elgamal';
import {ElementModQ} from '../core/group-common';
import {CryptoHashableElement, hashElements} from '../core/hash';
import {HashedElGamalCiphertext} from '../core/hashed-elgamal';
import {
  BallotState,
  SubmittedBallot,
  SubmittedContest,
  SubmittedSelection,
} from './submitted-ballot';

/**
 * Represents an encrypted ballot, notably including all of the
 * original encryption nonces. Use the submit() method to convert
 * to a {@link SubmittedBallot} suitable for serialization.
 */
export class CiphertextBallot {
  constructor(
    readonly ballotId: string,
    readonly ballotStyleId: string,
    readonly manifestHash: ElementModQ, // matches Manifest.cryptoHash
    readonly codeSeed: ElementModQ,
    readonly code: ElementModQ,
    readonly contests: Array<CiphertextContest>,
    readonly timestamp: number,
    readonly cryptoHash: ElementModQ,
    readonly masterNonce: ElementModQ
  ) {}

  ballotNonce(): ElementModQ {
    return hashElements(
      this.masterNonce.context,
      this.manifestHash,
      this.ballotId,
      this.masterNonce
    );
  }

  submit(state: BallotState): SubmittedBallot {
    return new SubmittedBallot(
      this.ballotId,
      this.ballotStyleId,
      this.manifestHash,
      this.codeSeed,
      this.code,
      this.contests.map(v => v.submit()),
      this.timestamp,
      this.cryptoHash,
      state
    );
  }
}

export class CiphertextContest implements CryptoHashableElement {
  constructor(
    readonly contestId: string, // matches ContestDescription.contestIdd
    readonly sequenceOrder: number, // matches ContestDescription.sequenceOrder
    readonly contestHash: ElementModQ, // matches ContestDescription.cryptoHash
    readonly selections: Array<CiphertextSelection>,
    readonly ciphertextAccumulation: ElGamalCiphertext,
    readonly cryptoHash: ElementModQ,
    readonly proof: ConstantChaumPedersenProofKnownNonce,
    readonly contestNonce: ElementModQ
  ) {}

  get cryptoHashElement(): ElementModQ {
    return this.cryptoHash;
  }

  submit(): SubmittedContest {
    return new SubmittedContest(
      this.contestId,
      this.sequenceOrder,
      this.contestHash,
      this.selections.map(v => v.submit()),
      this.ciphertextAccumulation,
      this.cryptoHash,
      this.proof
    );
  }
}

export class CiphertextSelection implements CryptoHashableElement {
  constructor(
    readonly selectionId: string, // matches SelectionDescription.selectionId
    readonly sequenceOrder: number, // matches SelectionDescription.sequenceOrder
    readonly selectionHash: ElementModQ, // matches SelectionDescription.cryptoHash
    readonly ciphertext: ElGamalCiphertext,
    readonly cryptoHash: ElementModQ,
    readonly isPlaceholderSelection: boolean,
    readonly proof: DisjunctiveChaumPedersenProofKnownNonce,
    readonly selectionNonce: ElementModQ,
    readonly extendedData?: HashedElGamalCiphertext
  ) {}

  get cryptoHashElement(): ElementModQ {
    return this.cryptoHash;
  }

  submit(): SubmittedSelection {
    return new SubmittedSelection(
      this.selectionId,
      this.sequenceOrder,
      this.selectionHash,
      this.ciphertext,
      this.cryptoHash,
      this.isPlaceholderSelection,
      this.proof,
      this.extendedData
    );
  }
}
