# 🗳 ElectionGuard Typescript

A TypeScript library that implements a subset of the
[ElectionGuard](https://www.electionguard.vote/) spec, allowing encryption of
ballots in browsers or other JavaScript engines.

![electionguard npm package](https://img.shields.io/npm/v/electionguard)

## Features

- Ballot encryption and JSON serialization

  We support a synchronous API, where we encrypt a `PlaintextBallot` object and
  return a `CiphertextBallot` object. We also support an asynchronous API,
  where `PlaintextContest` objects are encrypted asynchronously, and a
  `CiphertextBallot` can be fetched at the end. This allows the ballot
  encryption process to be spread across a voting session, minimizing
  user-visible lag.

  **Note**: write-ins and overvotes  are not supported in our implementation of ElectionGuard 1.0.

- Compatibility with [electionguard-python](https://github.com/microsoft/electionguard-python/)
- Support for modern browsers (roughly since 2018) including [bigint support](https://caniuse.com/bigint)
- Support for NodeJS

## Non-features

- Ballot decryption
- Ballot or election verification

# Installation

## Node

```sh
npm install electionguard
# or
yarn add electionguard
```

## Browser

As an **ES module**:

```html
<head>
  <!-- ... -->
  <script type="module">
    import {ManifestParty, bigIntContext4096} from './dist/electionguard.js';
    console.log(new ManifestParty(bigIntContext4096(), 'example'));
  </script>
</head>
```

As a **UMD module**:

```html
<head>
  <!-- ... -->
  <script src="./dist/electionguard.umd.js"></script>
</head>
<body>
  <!-- ... -->
  <script>
    console.log(
      new eg.ManifestParty(eg.bigIntContext4096(), 'example')
    );
  </script>
</body>
```

## Usage

```js
import {
  AsyncBallotEncryptor,
  bigIntContext4096,
  EncryptionDevice,
  PlaintextBallot,
  PlaintextContest,
  PlaintextSelection,
} from 'electionguard';

// computational context for subsequent encryptions
const context = bigIntContext4096();

// specification of the "device" computing the encryptions
const device = new EncryptionDevice(context, 55890250559315, 12345, 45678, 'polling-place');
let codeSeed = device.cryptoHashElement;

// data structures that would normally be downloaded alongside an election definition
const manifestObj = {
  election_scope_id: 'hamilton-county-general-election',
  spec_version: '1.0',
  // ...
};
const electionContextObj = {
  number_of_guardians: 5,
  quorum: 3,
  // ...
};

// data structures representing an unencrypted ballot
const ballot = new PlaintextBallot(
  'ballot-8a27eaa6-f1c3-11ec-b605-aaf53b701db4',
  'congress-district-5-hamilton-county',
  [
    new PlaintextContest('president-vice-president-contest', [
      new PlaintextSelection('cramer-vuocolo-selection', 1),
    ]),
    // ...
  ]
);

// asynchronous API for encrypting each contest as the user specifies it
const encryptor = AsyncBallotEncryptor.create(
  context,
  manifestObj,
  electionContextObj,
  false,
  ballot.ballotStyleId,
  ballot.ballotId,
  codeSeed
);
ballot.contests.forEach(contest => encryptor.encrypt(contest));

(async () => {
  // collect the encrypted ballot, blocking until all encryption is complete
  const result = await encryptor.getSerializedEncryptedBallot();

  const {serializedEncryptedBallot, ballotHash, ballotSeed} = result;
  // - serializedEncryptedBallot is a plain JavaScript object, suitable
  //   for converting to JSON, with the encrypted ballot.

  // - ballotHash is a bigint, representing the hash of the encrypted
  //   ballot, which a voter could potentially keep as their "receipt"

  // - ballotSeed is a bigint, representing the source of the randomness
  //   used to encrypt the ballot. This is a sensitive value that
  //   might be printed on the bottom of a human-readable paper ballot
  //   to allow a remote system to exactly recompute the encrypted ballot.

  console.log(JSON.stringify(serializedEncryptedBallot, null, 2));
})();
```

See the [`examples`](examples/) directory for more examples.

Check the [documentation](#documentation) for a full list of exports.

## Documentation

<!-- TODO: deploy these somewhere -->

You can generate API documentation using [TypeDoc](https://typedoc.org/guides/doccomments/).

```bash
npm run docs
```

## Development

```bash
# Install dependencies
npm install

# Now you can run various npm commands:
npm run test
npm run coverage
npm run build
npm run elgamal-bench
# ...

# Auto-indenter and linter (uses gts)
npm run fix
```

To try the browser examples, run `npm run build` first.

To run the node examples, first run `npm pack` in the root directory and uncompress the generated `.tgz` file.

See also:

- [`NOTES.md`](./NOTES.md)

## License

[MIT License](./LICENSE)

## Authors

- Han Guo <alexiland@outlook.com>
- Xin Hao <xinhaofighting@gmail.com>
- Shreyas Minocha <shreyasminocha@rice.edu>
- Dan S. Wallach <dwallach@rice.edu> or <dwallach@gmail.com>
- Arthur Wu <wuwenqin200613@gmail.com>
- Yanyu Zhong <yanyuzhongzyy@gmail.com>
- Zihe Zhao <zz83@rice.edu>
