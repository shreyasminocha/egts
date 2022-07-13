import fs from 'fs/promises';
import path from 'path';
import {
  BallotCodecs,
  getBallotCodecsForContext,
} from '../../src/electionguard/ballot/json';
import {
  getCoreCodecsForContext,
  eitherRightOrFail,
  CoreCodecs,
} from '../../src/electionguard/core/json';
import {
  bigIntContext4096,
  bigIntContextFromConstants,
} from '../../src/electionguard/core/group-bigint';
import {GroupContext} from '../../src/electionguard/core/group-common';
import {
  BallotState,
  CiphertextBallot,
  ElectionConstants,
  ElectionContext,
  encryptBallot,
  EncryptionDevice,
  EncryptionState,
  Manifest,
  PlaintextBallot,
  SubmittedBallot,
} from '../../src/electionguard';

const dir = path.join(
  'test',
  'compat',
  'sample',
  'hamilton-general',
  'election_record'
);

const constantsFile = path.join(dir, 'constants.json');
const manifestFile = path.join(dir, 'manifest.json');
const contextFile = path.join(dir, 'context.json');
const deviceFile = path.join(
  dir,
  'encryption_devices',
  'device_187970240912820.json'
);
const plaintextBallotFile = path.join(
  dir,
  '..',
  'election_private_data',
  'plaintext_ballots',
  'plaintext_ballot_ballot-8a27eaa6-f1c3-11ec-b605-aaf53b701db4.json'
);
const ciphertextBallotFile = path.join(
  dir,
  '..',
  'election_private_data',
  'ciphertext_ballots',
  'ciphertext_ballot_ballot-8a27eaa6-f1c3-11ec-b605-aaf53b701db4.json'
);
const submittedBallotFile = path.join(
  dir,
  'submitted_ballots',
  'submitted_ballot_ballot-8a27eaa6-f1c3-11ec-b605-aaf53b701db4.json'
);

describe('compatibility with electionguard-python', () => {
  let constants: ElectionConstants,
    manifest: Manifest,
    context: ElectionContext,
    device: EncryptionDevice,
    plaintextBallot: PlaintextBallot,
    ciphertextBallot: CiphertextBallot,
    ourCiphertextBallot: CiphertextBallot,
    submittedBallot: SubmittedBallot;
  let groupContext = bigIntContext4096();
  let bCodecs: BallotCodecs, cCodecs: CoreCodecs;

  test('can decode and re-encode constants.json', async () => {
    const content = await fs.readFile(constantsFile, 'utf-8');
    const constantsJson = JSON.parse(content);
    const possiblyConstants =
      getCoreCodecsForContext(groupContext).electionConstantsCodec.decode(
        constantsJson
      );
    constants = eitherRightOrFail(possiblyConstants);
    expect(constants).toBeTruthy();

    const context = bigIntContextFromConstants(constants);
    expect(groupContext).not.toBeUndefined();
    groupContext = context as GroupContext;

    bCodecs = getBallotCodecsForContext(groupContext);
    cCodecs = getCoreCodecsForContext(groupContext);
  });

  test('can decode and re-encode manifest.json', async () => {
    const content = await fs.readFile(manifestFile, 'utf-8');
    const manifestJson = JSON.parse(content);
    const possiblyManifest = bCodecs.manifestCodec.decode(manifestJson);
    manifest = eitherRightOrFail(possiblyManifest);
    expect(manifest).toBeTruthy();

    expect(bCodecs.manifestCodec.encode(manifest)).toStrictEqual(manifestJson);
  });

  test('can decode and re-encode context.json', async () => {
    const content = await fs.readFile(contextFile, 'utf-8');
    const contextJson = JSON.parse(content);
    const possiblyContext = cCodecs.electionContextCodec.decode(contextJson);
    context = eitherRightOrFail(possiblyContext);
    expect(context).toBeTruthy();

    expect(cCodecs.electionContextCodec.encode(context)).toStrictEqual(
      contextJson
    );
  });

  test('can decode and re-encode device data', async () => {
    const content = await fs.readFile(deviceFile, 'utf-8');
    const deviceJson = JSON.parse(content);
    const possiblyDevice = cCodecs.encryptionDeviceCodec.decode(deviceJson);
    device = eitherRightOrFail(possiblyDevice);
    expect(device).toBeTruthy();

    expect(cCodecs.encryptionDeviceCodec.encode(device)).toStrictEqual(
      deviceJson
    );
  });

  test('can decode and re-encode a plaintext ballot', async () => {
    const content = await fs.readFile(plaintextBallotFile, 'utf-8');
    const plaintextBallotJson = JSON.parse(content);
    const possiblyPlaintextBallot =
      getBallotCodecsForContext(groupContext).plaintextBallotCodec.decode(
        plaintextBallotJson
      );
    plaintextBallot = eitherRightOrFail(possiblyPlaintextBallot);
    expect(plaintextBallot).toBeTruthy();

    expect(bCodecs.plaintextBallotCodec.encode(plaintextBallot)).toStrictEqual(
      plaintextBallotJson
    );
  });

  test('can decode and re-encode a ciphertext ballot', async () => {
    const content = await fs.readFile(ciphertextBallotFile, 'utf-8');
    const ciphertextBallotJson = JSON.parse(content);
    const possiblyCiphertextBallot =
      bCodecs.ciphertextBallotCodec.decode(ciphertextBallotJson);
    ciphertextBallot = eitherRightOrFail(possiblyCiphertextBallot);
    expect(ciphertextBallot).toBeTruthy();

    expect(
      bCodecs.ciphertextBallotCodec.encode(ciphertextBallot)
    ).toStrictEqual(ciphertextBallotJson);
  });

  test('can decode and re-encode a submitted ballot', async () => {
    const content = await fs.readFile(submittedBallotFile, 'utf-8');
    const submittedBallotJson = JSON.parse(content);
    const possiblySubmittedBallot =
      bCodecs.submittedBallotCodec.decode(submittedBallotJson);
    submittedBallot = eitherRightOrFail(possiblySubmittedBallot);
    expect(submittedBallot).toBeTruthy();

    expect(bCodecs.submittedBallotCodec.encode(submittedBallot)).toStrictEqual(
      submittedBallotJson
    );
  });

  test('our ciphertext ballot matches that of the sample data', () => {
    const state = new EncryptionState(groupContext, manifest, context, true);
    ourCiphertextBallot = encryptBallot(
      state,
      plaintextBallot,
      device.cryptoHashElement, // That's the initial value of the ballot code seed
      ciphertextBallot.ballotEncryptionSeed, // called 'nonce' in the standard
      ciphertextBallot.timestamp
    );

    // expect(
    //   bCodecs.ciphertextBallotCodec.encode(ourCiphertextBallot)
    // ).toStrictEqual(bCodecs.ciphertextBallotCodec.encode(ciphertextBallot));
    expect(ourCiphertextBallot.equals(ciphertextBallot)).toBe(true);

    // TODO: also test this with encrypt-async
  });

  test('our submitted ballot matches that of the sample data', () => {
    const ourSubmittedBallot = ourCiphertextBallot.submit(BallotState.UNKNOWN);
    expect(ourSubmittedBallot.equals(submittedBallot)).toBe(true);
  });
});
