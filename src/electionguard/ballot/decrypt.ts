import {elGamalAdd, ElGamalKeypair} from '../core/elgamal';
import {ElementModQ} from '../core/group-common';
import {Manifest} from './manifest';
import {
  PlaintextBallot,
  PlaintextContest,
  PlaintextSelection,
} from './plaintext-ballot';
import {
  SubmittedBallot,
  SubmittedContest,
  SubmittedSelection,
} from './submitted-ballot';

/**
 * Simplified decryption support. Doesn't have any support for trustees/guardians.
 * All it can do is decrypt when the ElGamal public key and secret key are both known.
 * Throws an Error if absolutely anything goes wrong. Pretty much only really useful for
 * testing.
 */
export function decryptAndVerifyBallot(
  manifest: Manifest,
  extendedBaseHash: ElementModQ,
  keypair: ElGamalKeypair,
  ballot: SubmittedBallot
): PlaintextBallot {
  const pcontests = ballot.contests.map(c =>
    decryptAndVerifyContest(manifest, extendedBaseHash, keypair, c)
  );

  return new PlaintextBallot(ballot.ballotId, ballot.ballotStyleId, pcontests);
}

function decryptAndVerifyContest(
  manifest: Manifest,
  extendedBaseHash: ElementModQ,
  keypair: ElGamalKeypair,
  contest: SubmittedContest
): PlaintextContest {
  // first, verify the proof
  const cryptoSum = elGamalAdd(...contest.selections.map(s => s.ciphertext));
  const contestDescription = manifest.getContest(contest.contestId);
  if (contestDescription === undefined) {
    throw new Error(`unknown contestId: ${contest.contestId}`);
  }

  const proofValid = contest.proof.isValid(
    cryptoSum,
    keypair,
    extendedBaseHash,
    contestDescription.votesAllowed
  );

  if (!proofValid) {
    throw new Error('constant proof invalid');
  }

  const pselections = contest.selections.map(s =>
    decryptAndVerifySelection(extendedBaseHash, keypair, s)
  );

  const pSelectionsWithoutPlaceholders = pselections.filter(
    s => !s.isPlaceholderSelection
  );

  return new PlaintextContest(
    contest.contestId,
    pSelectionsWithoutPlaceholders
  );
}

function decryptAndVerifySelection(
  extendedBaseHash: ElementModQ,
  keypair: ElGamalKeypair,
  selection: SubmittedSelection
): PlaintextSelection {
  const proofValid = selection.proof.isValid(
    selection.ciphertext,
    keypair,
    extendedBaseHash
  );
  if (!proofValid) {
    throw new Error('proof validation failed');
  }

  const decryption = selection.ciphertext.decrypt(keypair);

  if (decryption === undefined) {
    throw new Error('decryption failuire');
  }

  // we're ignoring extended data; for now

  return new PlaintextSelection(
    selection.selectionId,
    decryption,
    selection.isPlaceholderSelection,
    undefined
  );
}
