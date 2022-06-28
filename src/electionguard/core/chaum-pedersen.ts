import {ElGamalCiphertext, ElGamalKeypair, ElGamalPublicKey} from './elgamal';
import {
  addQ,
  compatibleContextOrFail,
  ElementModP,
  ElementModQ,
  multP,
  multQ,
  negateQ,
  powP,
  subQ,
} from './group-common';
import {CryptoHashable, hashElements} from './hash';
import {Nonces} from './nonces';
import * as log from './logging';

/** Proof that the ciphertext is a given constant. */
export class ConstantChaumPedersenProofKnownNonce {
  constructor(
    readonly proof: ExpandedGenericChaumPedersenProof,
    readonly constant: number,
    readonly usage: ProofUsage = 'Unknown'
  ) {}

  /**
   * Produces a proof that a given ElGamal encryption corresponds to a specific total value. This
   * requires the prover to know the nonce (the r behind the g^r).
   *
   * @param plaintext The total allowed votes (L in the spec)
   * @param nonce The aggregate nonce used creating the ElGamal ciphertext (r in the spec)
   * @param publicKey The ElGamal public key for the election
   * @param seed Used to generate other random values here
   * @param qbar The election extended base hash (Q')
   */
  static create(
    ciphertext: ElGamalCiphertext,
    plaintext: number,
    nonce: ElementModQ,
    publicKey: ElGamalPublicKey | ElGamalKeypair,
    seed: ElementModQ,
    qbar: ElementModQ
  ): ConstantChaumPedersenProofKnownNonce {
    if (plaintext < 0) {
      throw Error('plaintext must be non-negative');
    }
    const context = compatibleContextOrFail(
      ciphertext.pad,
      nonce,
      publicKey.publicKeyElement,
      seed,
      qbar
    );

    // TODO: How much flexibility do we have on where this value comes from, specifically
    //   for the VBM application where we want to deterministically recreate the ballots
    //   later on? The spec seems silent on this.
    const proofW = hashElements(
      context,
      seed,
      qbar,
      'constant-chaum-pedersen-proof-known-nonce'
    );

    return new ConstantChaumPedersenProofKnownNonce(
      ExpandedGenericChaumPedersenProof.create(
        proofW, // w
        context.G_MOD_P, // g
        publicKey.publicKeyElement, // h
        nonce, // x
        [qbar, publicKey.publicKeyElement, ciphertext.pad, ciphertext.data] // hashHeader
      ),
      plaintext
    );
  }

  /**
   * Validates a proof against an ElGamal ciphertext.
   *
   * @param ciphertext An ElGamal ciphertext
   * @param publicKey The public key of the election
   * @param qbar The election extended base hash (Q')
   * @param expectedConstant Optional parameter. If specified, the constant in the proof is validated
   *     against the expected constant.
   * @return true if the proof is valid
   */
  isValid(
    ciphertext: ElGamalCiphertext,
    publicKey: ElGamalKeypair | ElGamalPublicKey,
    qbar: ElementModQ,
    expectedConstant = -1
  ): boolean {
    const context = compatibleContextOrFail(this.proof.c, ciphertext.pad, qbar);

    const constantQ = context.createElementModQ(this.constant);

    if (constantQ === undefined) {
      log.warn(
        'ConstantChaumPedersenProofKnownNonce',
        'invalid constant found in proof!'
      );
      return false;
    }

    const negativeC = negateQ(constantQ);

    return (
      ciphertext.isValidResidue() &&
      this.proof.isValid(
        context.G_MOD_P, // g
        ciphertext.pad, // gx
        publicKey.publicKeyElement, // h
        multP(ciphertext.data, context.gPowP(negativeC)), // hx
        [qbar, publicKey.publicKeyElement, ciphertext.pad, ciphertext.data] // hashHeader
      ) &&
      (expectedConstant !== -1 ? this.constant === expectedConstant : true)
    );
  }

  equals(other: ConstantChaumPedersenProofKnownNonce): boolean {
    return this.constant === other.constant && this.proof.equals(other.proof);
  }
}

/** Proof that the ciphertext is a given constant. */
export class ConstantChaumPedersenProofKnownSecretKey {
  constructor(
    readonly proof: ExpandedGenericChaumPedersenProof,
    readonly constant: number,
    readonly usage: ProofUsage = 'Unknown'
  ) {}

  /**
   * Produces a proof that a given ElGamal encryption corresponds to a specific total value. This
   * requires the prover to know the secret ElGamal encryption key.
   *
   * @param ciphertext The ElGamal ciphertext we're proving about
   * @param plaintext The plaintext constant value used to make the ElGamal ciphertext (L in the spec)
   * @param keypair The ElGamal secret and public key pair for the election
   * @param seed Used to generate other random values here
   * @param qbar The election extended base hash (Q')
   */
  static create(
    ciphertext: ElGamalCiphertext,
    plaintext: number,
    keypair: ElGamalKeypair,
    seed: ElementModQ,
    qbar: ElementModQ
  ): ConstantChaumPedersenProofKnownSecretKey {
    const context = compatibleContextOrFail(
      ciphertext.pad,
      keypair.secretKeyElement,
      seed,
      qbar
    );

    // TODO: How much flexibility do we have on where this value comes from, specifically
    //   for the VBM application where we want to deterministically recreate the ballots
    //   later on? The spec seems silent on this.
    const proofW = hashElements(
      context,
      seed,
      qbar,
      'constant-chaum-pedersen-proof-known-secret-key'
    );

    return new ConstantChaumPedersenProofKnownSecretKey(
      ExpandedGenericChaumPedersenProof.create(
        proofW, // w
        context.G_MOD_P, // g
        ciphertext.pad, // h = g^r
        keypair.secretKeyElement, // x = a
        [qbar, keypair.publicKeyElement, ciphertext.pad, ciphertext.data] // hashHeader
      ),
      plaintext
    );
  }

  /**
   * Validates a proof against an ElGamal ciphertext.
   *
   * @param ciphertext An ElGamal ciphertext
   * @param publicKey The public key of the election
   * @param qbar The election extended base hash (Q')
   * @param expectedConstant Optional parameter. If specified, the constant in the proof is validated
   *     against the expected constant.
   * @return true if the proof is valid
   */
  isValid(
    ciphertext: ElGamalCiphertext,
    publicKey: ElGamalKeypair | ElGamalPublicKey,
    qbar: ElementModQ,
    expectedConstant = -1
  ): boolean {
    const context = compatibleContextOrFail(
      this.proof.c,
      ciphertext.pad,
      publicKey.publicKeyElement,
      qbar
    );

    const constantQ = context.createElementModQ(this.constant);
    if (constantQ === undefined) {
      log.warn(
        'ConstantChaumPedersenProofKnownSecretKey',
        'invalid constant found in proof!'
      );
      return false;
    }

    return (
      ciphertext.isValidResidue() &&
      this.proof.isValid(
        context.G_MOD_P, // g
        publicKey.publicKeyElement, // gx = g^a
        ciphertext.pad, // h = g^r
        multP(ciphertext.data, context.gPowP(negateQ(constantQ))), // hx = g^{ar}g^m / g^m = g^ar
        [qbar, publicKey.publicKeyElement, ciphertext.pad, ciphertext.data] // hashHeader
      ) &&
      (expectedConstant !== -1 ? this.constant === expectedConstant : true)
    );
  }

  equals(other: ConstantChaumPedersenProofKnownNonce): boolean {
    return this.constant === other.constant && this.proof.equals(other.proof);
  }
}

/** Proof that the ciphertext is either zero or one.  */
export class DisjunctiveChaumPedersenProofKnownNonce {
  constructor(
    readonly proof0: ExpandedGenericChaumPedersenProof,
    readonly proof1: ExpandedGenericChaumPedersenProof,
    readonly c: ElementModQ,
    readonly usage: ProofUsage = 'Unknown'
  ) {}

  /**
   * Produces a proof that a given ElGamal encryption corresponds to either zero or one. This requires
   * the prover to know the nonce (the r behind the g^r).
   *
   * @param ciphertext The ElGamal ciphertext we're proving about
   * @param plaintext The actual plaintext constant value used to make the ElGamal ciphertext (L in
   *     the spec)
   * @param nonce The aggregate nonce used creating the ElGamal ciphertext (r in the spec)
   * @param publicKey The ElGamal public key for the election
   * @param seed Used to generate other random values here
   * @param qbar The election extended base hash (Q')
   */
  static create(
    ciphertext: ElGamalCiphertext,
    plaintext: number,
    nonce: ElementModQ,
    publicKey: ElGamalPublicKey | ElGamalKeypair,
    seed: ElementModQ,
    qbar: ElementModQ
  ): DisjunctiveChaumPedersenProofKnownNonce {
    const context = compatibleContextOrFail(
      ciphertext.pad,
      nonce,
      publicKey.publicKeyElement,
      seed,
      qbar
    );
    const alpha = ciphertext.pad;
    const beta = ciphertext.data;
    const nonces = new Nonces(seed, 'disjoint-chaum-pedersen-proof');

    switch (plaintext) {
      case 0: {
        // # Pick three random numbers in Q.
        const [c1, v, u0] = nonces;

        const a0 = context.gPowP(u0);
        const b0 = powP(publicKey.publicKeyElement, u0);
        const a1 = context.gPowP(v);
        const b1 = multP(
          powP(publicKey.publicKeyElement, v),
          context.gPowP(c1)
        );
        const c = hashElements(context, qbar, alpha, beta, a0, b0, a1, b1);
        const c0 = subQ(c, c1);
        const v0 = addQ(u0, multQ(c0, nonce));
        const v1 = addQ(v, multQ(c1, nonce));

        // console.log(`consistent c: ${addQ(c0, c1).equals(c)}`);

        const realZeroProof = new ExpandedGenericChaumPedersenProof(
          a0,
          b0,
          c0,
          v0
        );
        const fakeOneProof = new ExpandedGenericChaumPedersenProof(
          a1,
          b1,
          c1,
          v1
        );

        return new DisjunctiveChaumPedersenProofKnownNonce(
          realZeroProof,
          fakeOneProof,
          c
        );
      }
      case 1: {
        const [w, v, u1] = nonces;

        const a0 = context.gPowP(v);
        const b0 = multP(powP(publicKey.publicKeyElement, v), context.gPowP(w));
        const a1 = context.gPowP(u1);
        const b1 = powP(publicKey.publicKeyElement, u1);
        const c = hashElements(context, qbar, alpha, beta, a0, b0, a1, b1);
        const c0 = negateQ(w);
        const c1 = addQ(c, w);

        // console.log(`consistent c: ${addQ(c0, c1).equals(c)}`);

        const v0 = addQ(v, multQ(c0, nonce));
        const v1 = addQ(u1, multQ(c1, nonce));

        const fakeZeroProof = new ExpandedGenericChaumPedersenProof(
          a0,
          b0,
          c0,
          v0
        );
        const realOneProof = new ExpandedGenericChaumPedersenProof(
          a1,
          b1,
          c1,
          v1
        );

        return new DisjunctiveChaumPedersenProofKnownNonce(
          fakeZeroProof,
          realOneProof,
          c
        );
      }
      default:
        throw Error(
          'cannot compute disjunctive c-p proof with constant = $plaintext'
        );
    }
  }

  /**
   * Validates a proof against an ElGamal ciphertext.
   *
   * @param ciphertext An ElGamal ciphertext
   * @param publicKey The public key of the election
   * @param qbar The election extended base hash (Q')
   * @return true if the proof is valid
   */
  isValid(
    ciphertext: ElGamalCiphertext,
    publicKey: ElGamalPublicKey | ElGamalKeypair,
    qbar: ElementModQ,
    suppressWarnings = false
  ): boolean {
    const context = compatibleContextOrFail(
      this.c,
      ciphertext.pad,
      publicKey.publicKeyElement,
      qbar
    );

    const alpha = ciphertext.pad;
    const beta = ciphertext.data;
    const validCiphertext = ciphertext.isValidResidue();
    const pk = publicKey.publicKeyElement;
    const betaTimesGinv = multP(beta, context.G_INVERSE_MOD_P);
    const consistentC = addQ(this.proof0.c, this.proof1.c).equals(this.c);

    // This code was necessary when proof0 and proof1 were compact proofs,
    // but now they're expanded proofs. Keeping this around if we ever
    // change back to compact proofs, probably for EG 2.0.

    /*
    const eproof0 = this.proof0.expand(
      context.G_MOD_P, // g
      alpha, // gx
      pk, // h
      beta // hx
    );

    const eproof1 = this.proof1.expand(
      context.G_MOD_P, // g
      alpha, // gx
      pk, // h
      betaTimesGinv // hx
    );
    */

    const validHash = this.c.equals(
      hashElements(
        context,
        qbar,
        alpha,
        beta,
        this.proof0.a,
        this.proof0.b,
        this.proof1.a,
        this.proof1.b
      )
    );

    const valid0 = this.proof0.isValid(
      context.G_MOD_P, // g
      alpha, // gx
      pk, // h
      beta, // hx
      [qbar], // hashHeader
      false, // checkC
      suppressWarnings,
      false // hashesOnly
    );

    const valid1 = this.proof1.isValid(
      context.G_MOD_P, // g
      alpha, // gx
      pk, // h
      betaTimesGinv, // hx
      [qbar], // hashHeader
      false, // checkC
      suppressWarnings,
      false // hashesOnly
    );

    // If valid0 or valid1 is false, this will already have been logged,
    // so we don't have to repeat it here.
    if ((!consistentC || !validHash || !validCiphertext) && !suppressWarnings)
      log.warn(
        'DisjunctiveChaumPedersenProofKnownNonce',
        `Invalid commitments for disjunctive Chaum-Pedersen proof: ${JSON.stringify(
          {
            consistentC: consistentC,
            validHash: validHash,
            validCiphertext: validCiphertext,
            valid0: valid0,
            valid1: valid1,
          }
        )}`
      );

    return valid0 && valid1 && consistentC && validHash && validCiphertext;
  }

  equals(other: DisjunctiveChaumPedersenProofKnownNonce): boolean {
    return (
      this.c.equals(other.c) &&
      this.proof0.equals(other.proof0) &&
      this.proof1.equals(other.proof1)
    );
  }
}

/**
 * General-purpose Chaum-Pedersen proof object, demonstrating that the prover knows the exponent `x`
 * for two tuples `(g, g^x)` and `(h, h^x)`, without revealing anything about `x`. This is used as a
 * component in other proofs.
 *
 * @param c hash(a, b, and possibly other state) (aka challenge)
 * @param r w + xc (aka response)
 */
export class CompactGenericChaumPedersenProof {
  constructor(readonly c: ElementModQ, readonly r: ElementModQ) {}

  /**
   * Produces a generic Chaum-Pedersen proof that two tuples share an exponent, i.e., that for (g,
   * g^x) and (h, h^x), it's the same value of x, but without revealing x. This generic proof can be
   * used as a building-block for many other proofs.
   *
   * There's no need for g^x and h^x in this particular computation.
   *
   * @param w An element in Q, typically derived from the seed, used to randomize the generation of the proof
   * @param g Any valid element in the subgroup of P
   * @param h Any valid element in the subgroup of P
   * @param x Any element in Q
   * @param hashHeader Optional additional values to include in the start of the challenge computation
   *     hash.
   */
  static create(
    w: ElementModQ,
    g: ElementModP,
    h: ElementModP,
    x: ElementModQ, // secret
    hashHeader: Array<CryptoHashable> = []
  ): CompactGenericChaumPedersenProof {
    return ExpandedGenericChaumPedersenProof.create(
      w,
      g,
      h,
      x,
      hashHeader
    ).compact();
  }

  /**
   * Checks that this Chaum-Pedersen proof certifies that the prover knew an x, such that (g, g^x) and
   * (h, h^x) share the same exponent x, without revealing x. Part of the proof is a challenge
   * constant. By suppressing this check, "fake" proofs can be validated. Useful when doing
   * disjunctive proofs.
   *
   * @param g See above.
   * @param gx See above.
   * @param h See above.
   * @param hx See above.
   * @param hashHeader Optional additional values to include in the hash challenge computation hash
   * @param checkC If false, the challenge constant is not verified. (default: true)
   * @return true if the proof is valid
   */
  isValid(
    g: ElementModP,
    gx: ElementModP,
    h: ElementModP,
    hx: ElementModP,
    hashHeader: Array<CryptoHashable> = [],
    checkC = true,
    suppressWarnings = false
  ): boolean {
    return this.expand(g, gx, h, hx).isValid(
      g,
      gx,
      h,
      hx,
      hashHeader,
      checkC,
      suppressWarnings,
      true // only check the hashes, since we've reconstructed a and b
    );
  }

  /**
   * Computers the `a` and `b` values that are needed for proofs and such, but are removed for serialization.
   */
  expand(
    g: ElementModP,
    gx: ElementModP,
    h: ElementModP,
    hx: ElementModP
  ): ExpandedGenericChaumPedersenProof {
    const negC = negateQ(this.c);
    const gr = powP(g, this.r); // g^r = g^{w + xc}
    const hr = powP(h, this.r); // h^r = h^{w + xc}
    const a = multP(gr, powP(gx, negC)); // cancelling out the xc, getting g^w
    // const a = divP(gr, powP(gx, this.c)); // cancelling out the xc, getting g^w
    const b = multP(hr, powP(hx, negC)); // cancelling out the xc, getting h^w

    // console.log('Expanding compact proof:');
    // console.log(`newA = ${a.toString()}`);
    // console.log(`newB = ${b.toString()}`);
    return new ExpandedGenericChaumPedersenProof(a, b, this.c, this.r);
  }

  equals(other: CompactGenericChaumPedersenProof): boolean {
    return this.c.equals(other.c) && this.r.equals(other.r);
  }
}

/**
 * Expanded form of the GenericChaumPedersenProof, with the `a` and `b` values recomputed. This
 * should not be serialized.
 */
export class ExpandedGenericChaumPedersenProof {
  constructor(
    readonly a: ElementModP,
    readonly b: ElementModP,
    readonly c: ElementModQ,
    readonly r: ElementModQ
  ) {}

  /**
   * Produces a generic Chaum-Pedersen proof that two tuples share an exponent, i.e., that for (g,
   * g^x) and (h, h^x), it's the same value of x, but without revealing x. This generic proof can be
   * used as a building-block for many other proofs.
   *
   * There's no need for g^x and h^x in this particular computation.
   *
   * @param w An element in Q, typically derived from the seed, used to randomize the generation of the proof
   * @param g Any valid element in the subgroup of P
   * @param h Any valid element in the subgroup of P
   * @param x Any element in Q
   * @param hashHeader Optional additional values to include in the start of the challenge computation
   *     hash.
   */
  static create(
    w: ElementModQ,
    g: ElementModP,
    h: ElementModP,
    x: ElementModQ, // secret
    hashHeader: Array<CryptoHashable> = []
  ): ExpandedGenericChaumPedersenProof {
    const context = compatibleContextOrFail(w, g, h, x);

    // The proof uses a random value w ∈ Z_q , computes the commitments (a, b) = (g^w, A^w),
    // obtains the challenge value as c = H( Q̄, A, B, a , b, M)
    // and the response r = (w + c * s) mod q.
    // The proof is (a, b, c, r)

    const a = powP(g, w);
    const b = powP(h, w);
    // console.log('Proof construction:');
    // console.log(`w = ${w.toString()}`);
    // console.log(`a = ${a.toString()}`);
    // console.log(`b = ${b.toString()}`);

    const allHeaders = hashHeader.concat([a, b]);
    // console.log(
    //   `Create: Hashing(${allHeaders.map(x => x?.toString()).join(', ')})`
    // );
    const c = hashElements(context, ...allHeaders);
    const xc = multQ(x, c);
    // console.log(`xc = ${xc.toString()}`);
    const r = addQ(w, xc);
    // console.log(`r = w + xc = ${r.toString()}`);

    return new ExpandedGenericChaumPedersenProof(a, b, c, r);
  }

  /** Removes unnecessary contents, resulting in a much smaller proof. */
  compact(): CompactGenericChaumPedersenProof {
    return new CompactGenericChaumPedersenProof(this.c, this.r);
  }

  /**
   * Checks that this Chaum-Pedersen proof certifies that the prover knew an x, such that (g, g^x) and
   * (h, h^x) share the same exponent x, without revealing x. Part of the proof is a challenge
   * constant. By suppressing this check, "fake" proofs can be validated. Useful when doing
   * disjunctive proofs.
   *
   * @param g See above.
   * @param gx See above.
   * @param h See above.
   * @param hx See above.
   * @param hashHeader Optional additional values to include in the hash challenge computation hash
   * @param checkC If false, the challenge constant is not verified. (default: true)
   * @param hashesOnly If true, avoids validating correctness of a and b. (default: false)
   * @return true if the proof is valid
   */
  isValid(
    g: ElementModP,
    gx: ElementModP,
    h: ElementModP,
    hx: ElementModP,
    hashHeader: Array<CryptoHashable> = [],
    checkC = true,
    suppressWarnings = false,
    hashesOnly = false
  ): boolean {
    const context = compatibleContextOrFail(this.c, g, gx, h, hx);

    // Refactored these checks: see NOTES.md
    // const inBoundsG = g.isValidResidue();
    // const inBoundsGx = gx.isValidResidue();
    // const inBoundsH = h.isValidResidue();
    // const inBoundsHx = hx.isValidResidue();

    const allHeaders = hashHeader.concat([this.a, this.b]);

    let validA: boolean;
    let validB: boolean;

    if (!hashesOnly) {
      const negC = negateQ(this.c);
      const gr = powP(g, this.r); // g^r = g^{w + xc}
      const hr = powP(h, this.r); // h^r = h^{w + xc}
      const expectedA = multP(gr, powP(gx, negC)); // cancelling out the xc, getting g^w
      const expectedB = multP(hr, powP(hx, negC)); // cancelling out the xc, getting h^w

      // console.log('Proof verification:');
      // console.log(`r = ${this.r.toString()}`);
      // console.log(`expectedA = ${expectedA.toString()}`);
      // console.log(`expectedB = ${expectedB.toString()}`);

      validA = this.a.equals(expectedA);
      validB = this.b.equals(expectedB);
    } else {
      validA = true;
      validB = true;
    }

    // console.log(
    //   `isValid: Hashing(${allHeaders.map(x => x?.toString()).join(', ')})`
    // );

    const hashGood =
      !checkC || this.c.equals(hashElements(context, ...allHeaders));

    const success =
      hashGood &&
      // inBoundsG &&
      // inBoundsGx &&
      // inBoundsH &&
      // inBoundsHx &&
      validA &&
      validB;

    if (!success && !suppressWarnings)
      log.warn(
        'ExpandedGenericChaumPedersenProof',
        `Invalid generic Chaum-Pedersen proof: ${JSON.stringify({
          hashGood: hashGood,
          // inBoundsG: inBoundsG,
          // inBoundsGx: inBoundsGx,
          // inBoundsH: inBoundsH,
          // inBoundsHx: inBoundsHx,
          validA: validA,
          validB: validB,
        })}`
      );

    return success;
  }

  equals(other: ExpandedGenericChaumPedersenProof): boolean {
    return (
      this.c.equals(other.c) &&
      this.r.equals(other.r) &&
      this.a.equals(other.a) &&
      this.b.equals(other.b)
    );
  }
}

export const ProofUsageStrings = [
  'Unknown',
  'Prove knowledge of secret value',
  "Prove value within selection's limit",
  "Prove selection's value (0 or 1)",
];

/** typed union of acceptable strings */
export type ProofUsage = typeof ProofUsageStrings[number];
