import {ElGamalCiphertext} from '../core/elgamal';
import {ElementModQ} from '../core/group-common';

/** The encrypted representation of the summed votes for a collection of ballots */
export class CiphertextTally {
  constructor(
    readonly tallyId: string,
    readonly contests: Map<string, CiphertextTallyContest> // map<contestId, contest>
  ) {}
}

/**
 * The encrypted selections for a specific contest. The contestId is the
 * Manifest.ContestDescription.contestId.
 */
export class CiphertextTallyContest {
  constructor(
    readonly contestId: string,
    readonly sequenceOrder: number,
    readonly contestDescriptionHash: ElementModQ, // matches ContestDescription.cryptoHash
    readonly selections: Map<String, CiphertextTallySelection> // map<selectionId, selection>
  ) {}
}

/**
 * The homomorphic accumulation of all of the CiphertextBallot.Selection for a specific
 * selection and contest. The selectionId is the Manifest.SelectionDescription.object_id.
 */
export class CiphertextTallySelection {
  constructor(
    readonly selectionId: string,
    readonly sequenceOrder: number,
    readonly selectionDescriptionHash: ElementModQ, // matches SelectionDescription.cryptoHash
    readonly ciphertext: ElGamalCiphertext
  ) {}
}
