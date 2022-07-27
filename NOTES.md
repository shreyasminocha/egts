# Engineering notes

## The computational groups

The initial implementation of `ElementModP` and `ElementModQ`,
in `group-bigint.ts`,
uses JavaScript's built-in `bigint` type (for any modern browser), with an external library
that supports modular exponentation. For common-case modular exponentations, using the
group generator or public key as a base, we use an optimization, in `powradix`, that
does table lookups and multiplies. This results in significant speedups.

Our code has additional support in it for doing these multiplies in 
[Montgomery form](https://en.wikipedia.org/wiki/Montgomery_modular_multiplication),
which replaces the need for modulo operations after each multiply with bit shifting
and masking.
However, when we tried doing it with `bigint`, it turned out to be slower than
just doing the modulo operations. You can see this experiment on the [montgomery-arithmetic branch](https://github.com/danwallach/ElectionGuard-TypeScript/tree/montgomery-arithmetic).

The code currently distinguishes between `group-bigint` versus `group-common`, anticipating
multiple implementations of the core group abstraction. For example, on the [hacl-wasm branch](https://github.com/danwallach/ElectionGuard-TypeScript/tree/hacl-wasm), there's an experimental implementation called `group-hacl` that uses Microsoft's HACL* port to WebAssembly. It gives correct answers, but is significantly slower than the `bigint` implementation, despite the Montgomery form optimization above. The implementation,
on that branch, pays to copy data from JavaScript memory into WASM memory and copies
results back to JavaScript memory on each operation. This might or might not be
the performance bottleneck.

## GroupContext

We've written the code to support both the 3072 and 4096-bit values for the
generator and the P modulus. We've also written the code to be able to support both HACL-WASM
and JavaScript `bigint`. All of this stuff is hidden inside a `GroupContext` object. The
`bigint` versions can be fetched with `bigIntContext4096()` or `bigIntContext3072()`, respectively.
For most arithmetic in a group, you'll
just use the helper functions defined in `group-common.ts` (e.g., `addQ()` or `multP()`) and
every `ElementModP` and `ElementModQ` tracks the context from which it was created. Likewise,
all the arithmetic operators will throw an exception if you accidentally mix and match elements
that were created in different contexts.

## Chaum-Pedersen proofs

The ElectionGuard spec talks about validating Chaum-Pedersen proof elements-mod-P for being
valid residues (i.e., members of the subgroup of P). The way we've refactored these proofs to
use a generic proof object, we might naïvely end up doing unnecessary checks, such as raising
the generator to a power and then checking that it's valid, which is *always* going to be true.
Instead, we've refactored things so untrusted inputs are checked. In particular, all `ElGamalCiphertext`
objects are validated before we use them in validating a Chaum-Pedersen proof. The mod-P elements
in the proofs, themselves, are separately validated through equality testing against numbers that
we recompute, so that equality test will imply that the proof elements are all valid.

This codebase is primarily intended for encrypting ballots, along with generating
the associated proofs, so verification isn't strictly necessary at all, but, [as described
below](#have-we-written-way-too-much-code), we include the verification code and use it in our unit test suite. So long as it's here, it might as well be good.

## Serialization

We're using a functional IO library, [io-ts](https://github.com/gcanti/io-ts),
which has support for writing custom converters to and from basic JavaScript objects with only
primitive types, which can then be serialized as JSON objects. What makes `io-ts` really great is
that it has support for functional-style pipelines and error-handling, so if any stage of the
pipeline has a problem, it just flags the error and the result is an error. This does mean
that we don't have any *automatic* serialization code. It's all manually written (in `json.ts`),
but it seems to be pleasantly robust.

## Concurrency

Today, we have the `encrypt-async` implementation that allows each contest to be encrypted
as a background (async) task. However, modern JavaScript engines are single-threaded, so
this could potentially cause user-visible latency ("jank"). We've delayed work
on addressing this until we know whether it's bad enough to matter. Preliminary
experiments show that encrypting a contest with five selections takes 30ms on
a 3.5GHz Pentium Xeon. But what's the worst-case device? Maybe this latency is
still small enough that it doesn't matter.

But if we do have to fix it, here are a bunch of notes on how to ultimately move
the work from the UI thread to a WebWorker, allowing the computation to run without
any user-visible latency. Ideally, we'd have a "queue" abstraction, where we
submitted contests to be encrypted, and a pool of WebWorkers would process
the queue. But how to implement that? The current leading solution is `workerpool`.

- Instructions for using [workerpool](https://github.com/josdejong/workerpool): https://spin.atomicobject.com/2019/02/18/wrap-typescript-function/
  - Looks like there's a `workerEmit()` function that lets us have them just generating stuff and a `cpus` property to know how many to launch
    - But there doesn't seem to be a way to do a bounded queue with `workerEmit`. There is an optional bound on the number of tasks.
  - Kinda useful tutorial: https://blog.logrocket.com/using-webworkers-for-safe-concurrent-javascript-3f33da4eb0b2/

- Google's [clooney](https://github.com/GoogleChromeLabs/clooney) seems like exactly the right idea for setting up "actors" that hold state and then you just call them. The code hasn't been updated in long enough that it doesn't seem to play nicely when you try to load it. And I tried dropping the code in directly to this repo, and ran into a bunch of other errors. Sadly, seems unlikely to work. Among other issues, doesn't seem to support Node.

- [fastq](https://github.com/mcollina/fastq), seems popular, but nothing for WebWorkers

- [better-queue](https://github.com/diamondio/better-queue), lots of extra features, but again nothing for WebWorkers

- [threads.js](https://github.com/andywer/threads.js/blob/master/docs/usage-pool.md) has a pool abstraction with task queuing, much like workerpool, but no way to just have a producer cranking away that's limited by a queue

- [parallel.js](https://github.com/parallel-js/parallel.js) has the whole map/reduce paradigm, but no asynchronous queues

- [operative](https://github.com/padolsey/operative) has callbacks, but no queueing

- [SuperWorkers](https://github.com/softvar/super-workers) has a priority queueing system, no commits since 2019.

- [promise-blocking-queue](https://github.com/PruvoNet/promise-blocking-queue) doesn't understand WebWorkers, but might be rigged together with it... somehow
- [queue](https://github.com/jessetane/queue) similar to the above?

- [tiny-worker](https://github.com/avoidwork/tiny-worker) doesn't seem to add much above vanilla webworkers


Things that use Redis (and therefor might not work with webworkers?)
- [Bull / BullMQ](https://github.com/taskforcesh/bullmq) says it's "based on Redis", but appears to be able to run everything locally. This is a heavier-weight solution, but might actually do what we need
- [bee-queue](https://github.com/bee-queue/bee-queue)
- [celery-node](https://celery-node.js.org/#/)
- [temporal](https://docs.temporal.io/docs/temporal-explained/task-queues-and-workers) - this one seems to know how to run locally?

An alternative approach would be to have a background task that pre-generates encryptions
(e.g., a stream of encrypted 1's and another stream of encrypted 0's). electionguard-c++
does a fancier version of this on a precinct ballot scanner to take advantage of the dead time between ballots. 

Before we go there, the first thing to try would probably be `workerpool` with
the current asynchronous API.

## Arithmetic operators

- JavaScript / TypeScript doesn't have operator overloading, like at all. (It's at the "proposal" stage.)
- We could do bare top-level functions, or we could follow the Java style of making everything impl methods. For now, we just have bare functions, with tighter types than the original Python, but it's the same basic idea.

## Have we written way too much code?

We expect this code to only ever be deployed in a browser-like environment and used for encrypting ballots.
That means we need to encrypt, but not decrypt or accumulate. We need to create Chaum-Pedersen proofs, but 
not validate them. But nonetheless we have decryption and validation methods as part of the code. This
seems like overkill, but it turns out to be essential to validating the correctness of the code. That means
it's just a problem of [tree shaking](https://webpack.js.org/guides/tree-shaking/) ([detailed article](https://www.smashingmagazine.com/2021/05/tree-shaking-reference-guide/)) as part of the deployment process
to remove what amounts to dead code.

Similarly, you'll see in the Chaum-Pedersen code that we have "expanded" and "compact" proofs. The
compact proofs aren't going to be used until ElectionGuard 2.0, but they're here and they work, with
`compact()` and `expand()` methods to go back and forth. Again, this helps us validate correctness,
and if we decide that we really, really want to save bandwidth, it will be a trivial switch to flip
in the code to move to the compact proofs.
