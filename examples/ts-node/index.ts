import assert from 'assert';
import {
  AsyncBallotEncryptor,
  bigIntContext4096,
  PlaintextBallot,
  PlaintextContest,
  PlaintextSelection,
  EncryptionDevice,
} from '../../dist/index.js';
import manifestObj from '../manifest.json' assert {type: 'json'};
import electionContextObj from '../context.json' assert {type: 'json'};

const context = bigIntContext4096();
const device = new EncryptionDevice(
  context,
  55890250559315,
  12345,
  45678,
  'polling-place'
);
let codeSeed = device.cryptoHashElement;

const ballot = new PlaintextBallot(
  'ballot-85c8f918-73fc-11ec-9daf-acde48001122',
  'ballot-style-01',
  [
    new PlaintextContest('referendum-pineapple', [
      new PlaintextSelection('referendum-pineapple-affirmative-selection', 0),
      new PlaintextSelection('referendum-pineapple-negative-selection', 1),
    ]),
  ]
);

const encryptor = AsyncBallotEncryptor.create(
  context,
  manifestObj,
  electionContextObj,
  false,
  ballot.ballotStyleId,
  ballot.ballotId,
  codeSeed,
  context.createElementModQFromHex(
    '13EE0734C0AADFFC11002A950CC6278B648B5AB3BFF098C4103FE0BABAA778C1'
  ),
  1642028895
);
ballot.contests.forEach(contest => encryptor.encrypt(contest));

const result = await encryptor.getSerializedEncryptedBallot();
const {serializedEncryptedBallot, ballotHash} = result;

const ballotHashModQ = context.createElementModQ(ballotHash);
if (ballotHashModQ === undefined) {
  throw new Error('unable to create ElementModQ from ballotHash');
}
codeSeed = ballotHashModQ;

assert.strictEqual(
  (serializedEncryptedBallot as unknown)['crypto_hash'],
  'D8C83E068D0AC92C384E1A1E9A6460C565B0324F51E8ECDEC0A9622176FB9EA1'
);
