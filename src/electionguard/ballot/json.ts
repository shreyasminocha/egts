import * as D from 'io-ts/lib/Decoder.js';
import * as E from 'io-ts/lib/Encoder.js';
import * as C from 'io-ts/lib/Codec.js';
import {pipe} from 'fp-ts/lib/function.js';
import {GroupContext} from '../core/group-common';
import * as M from './manifest';
import {
  SubmittedContest,
  SubmittedBallot,
  SubmittedSelection,
} from './submitted-ballot';
import {
  CiphertextContest,
  CiphertextBallot,
  CiphertextSelection,
} from './ciphertext-ballot';
import {
  PlaintextContest,
  PlaintextBallot,
  PlaintextSelection,
} from './plaintext-ballot';
import {nullToUndefined, undefinedToNull} from '../core/utils';
import * as CJ from '../core/json';
import {EncryptionState} from './encrypt';

// These JSON importer/exporter things are using the io-ts package:
// https://github.com/gcanti/io-ts/
// Which, in turn, uses a functional programming library:
// https://github.com/gcanti/fp-ts/

// The decoders have a pipeline where each stage of the pipe is returning Either<Error, T>
// and if an error occurs, the pipeline stops and just returns the error. The output
// isn't actually a JSON string. It's just a JavaScript object with the right fields
// in the right places. You could then call JSON.stringify() on it to get a string,
// and JSON.parse() to get back.

// The encoders don't have to worry about errors, since they presume their input is
// well-formed to begin with.

/**
 * This class gives you a series of {@link C.Codec} codecs. This know how to
 * decode (from ElectionGuard types to plain JS objects, suitable for serialization)
 * and encode (from plain JS objects back to the ElectionGuard types). Note that
 * it's important to use the right codec for the right group. If you decode from
 * a 4096-bit group and encode to a 3072-bit group, the results are not going to
 * be correct.
 */
export class BallotCodecs {
  readonly coreCodecs: CJ.CoreCodecs;
  readonly manifestLanguageCodec: C.Codec<unknown, unknown, M.ManifestLanguage>;
  readonly manifestInternationalizedTextCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestInternationalizedText
  >;
  readonly manifestSelectionDescriptionCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestSelectionDescription
  >;
  readonly manifestAnnotatedStringCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestAnnotatedString
  >;
  readonly manifestElectionTypeCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestElectionType
  >;
  readonly manifestVoteVariationTypeCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestVoteVariationType
  >;
  readonly manifestReportingUnitTypeCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestReportingUnitType
  >;
  readonly manifestContactInformationCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestContactInformation
  >;
  readonly manifestGeopoliticalUnitCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestGeopoliticalUnit
  >;
  readonly manifestCandidateCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestCandidate
  >;
  readonly manifestPartyCodec: C.Codec<unknown, unknown, M.ManifestParty>;
  readonly manifestBallotStyleCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestBallotStyle
  >;
  readonly manifestCodec: C.Codec<unknown, unknown, M.Manifest>;
  readonly manifestContestDescriptionCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestContestDescription
  >;
  readonly manifestCandidateContestDescriptionCodec: C.Codec<
    unknown,
    unknown,
    M.ManifestCandidateContestDescription
  >;
  readonly submittedContestCodec: C.Codec<unknown, unknown, SubmittedContest>;
  readonly submittedSelectionCodec: C.Codec<
    unknown,
    unknown,
    SubmittedSelection
  >;
  readonly submittedBallotCodec: C.Codec<unknown, unknown, SubmittedBallot>;
  readonly ciphertextSelectionCodec: C.Codec<
    unknown,
    unknown,
    CiphertextSelection
  >;
  readonly ciphertextContestCodec: C.Codec<unknown, unknown, CiphertextContest>;
  readonly ciphertextBallotCodec: C.Codec<unknown, unknown, CiphertextBallot>;
  readonly plaintextSelectionCodec: C.Codec<
    unknown,
    unknown,
    PlaintextSelection
  >;
  readonly plaintextContestCodec: C.Codec<unknown, unknown, PlaintextContest>;
  readonly plaintextBallotCodec: C.Codec<unknown, unknown, PlaintextBallot>;
  readonly encryptionStateCodec: C.Codec<unknown, unknown, EncryptionState>;

  constructor(readonly context: GroupContext) {
    this.coreCodecs = CJ.getCoreCodecsForContext(context);

    const manifestLanguageDecoder: D.Decoder<unknown, M.ManifestLanguage> =
      pipe(
        D.struct({
          value: D.string,
        }),
        D.intersect(
          D.partial({
            language: D.string,
          })
        ),
        D.map(s => new M.ManifestLanguage(context, s.value, s.language))
      );

    const manifestLanguageEncoder: E.Encoder<unknown, M.ManifestLanguage> = {
      encode: input => ({
        value: input.value,
        language: input.language,
      }),
    };

    this.manifestLanguageCodec = C.make(
      manifestLanguageDecoder,
      manifestLanguageEncoder
    );

    const manifestInternationalizedTextDecoder: D.Decoder<
      unknown,
      M.ManifestInternationalizedText
    > = pipe(
      D.partial({
        text: D.array(manifestLanguageDecoder),
      }),
      D.map(s => new M.ManifestInternationalizedText(context, s.text))
    );

    const manifestInternationalizedTextEncoder: E.Encoder<
      unknown,
      M.ManifestInternationalizedText
    > = {
      encode: input => ({
        text: input.text.map(s => manifestLanguageEncoder.encode(s)),
      }),
    };

    this.manifestInternationalizedTextCodec = C.make(
      manifestInternationalizedTextDecoder,
      manifestInternationalizedTextEncoder
    );

    const manifestElectionTypeDecoder: D.Decoder<
      unknown,
      M.ManifestElectionType
    > = pipe(
      D.string,
      D.refine(
        (s): s is M.ManifestElectionType =>
          M.ManifestElectionTypeStrings.includes(s),
        'valid string'
      )
    );
    const manifestElectionTypeEncoder: E.Encoder<
      unknown,
      M.ManifestElectionType
    > = {
      encode: input => input,
    };

    this.manifestElectionTypeCodec = C.make(
      manifestElectionTypeDecoder,
      manifestElectionTypeEncoder
    );

    const manifestReportingUnitTypeDecoder: D.Decoder<
      unknown,
      M.ManifestReportingUnitType
    > = pipe(
      D.string,
      D.refine(
        (s): s is M.ManifestReportingUnitType =>
          M.ManifestReportingUnitTypeStrings.includes(s),
        'valid string'
      )
    );
    const manifestReportingUnitTypeEncoder: E.Encoder<
      unknown,
      M.ManifestReportingUnitType
    > = {
      encode: input => input,
    };

    this.manifestReportingUnitTypeCodec = C.make(
      manifestReportingUnitTypeDecoder,
      manifestReportingUnitTypeEncoder
    );

    const manifestVoteVariationTypeDecoder: D.Decoder<
      unknown,
      M.ManifestVoteVariationType
    > = pipe(
      D.string,
      D.refine(
        (s): s is M.ManifestVoteVariationType =>
          M.ManifestVoteVariationTypeStrings.includes(s),
        'valid string'
      )
    );
    const manifestVoteVariationTypeEncoder: E.Encoder<
      unknown,
      M.ManifestVoteVariationType
    > = {
      encode: input => input,
    };

    this.manifestVoteVariationTypeCodec = C.make(
      manifestVoteVariationTypeDecoder,
      manifestVoteVariationTypeEncoder
    );

    const manifestSelectionDescriptionDecoder: D.Decoder<
      unknown,
      M.ManifestSelectionDescription
    > = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        candidate_id: D.string,
      }),
      D.map(
        s =>
          new M.ManifestSelectionDescription(
            context,
            s.object_id,
            s.sequence_order,
            s.candidate_id
          )
      )
    );

    const manifestSelectionDescriptionEncoder: E.Encoder<
      unknown,
      M.ManifestSelectionDescription
    > = {
      encode: input => ({
        object_id: input.objectId,
        sequence_order: input.sequenceOrder,
        candidate_id: input.candidateId,
      }),
    };

    this.manifestSelectionDescriptionCodec = C.make(
      manifestSelectionDescriptionDecoder,
      manifestSelectionDescriptionEncoder
    );

    const manifestAnnotatedStringDecoder: D.Decoder<
      unknown,
      M.ManifestAnnotatedString
    > = pipe(
      D.partial({
        annotation: D.string,
        value: D.string,
      }),
      D.map(s => new M.ManifestAnnotatedString(context, s.annotation, s.value))
    );

    const manifestAnnotatedStringEncoder: E.Encoder<
      unknown,
      M.ManifestAnnotatedString
    > = {
      encode: input => ({
        annotation: input.annotation,
        value: input.value,
      }),
    };

    this.manifestAnnotatedStringCodec = C.make(
      manifestAnnotatedStringDecoder,
      manifestAnnotatedStringEncoder
    );

    const manifestContactInformationDecoder: D.Decoder<
      unknown,
      M.ManifestContactInformation
    > = pipe(
      D.partial({
        address_line: D.nullable(D.array(D.string)),
        email: D.nullable(D.array(manifestAnnotatedStringDecoder)),
        phone: D.nullable(D.array(manifestAnnotatedStringDecoder)),
        name: D.nullable(D.string),
      }),
      D.map(
        s =>
          new M.ManifestContactInformation(
            context,
            nullToUndefined(s.address_line),
            nullToUndefined(s.email),
            nullToUndefined(s.phone),
            nullToUndefined(s.name)
          )
      )
    );

    const manifestContactInformationEncoder: E.Encoder<
      unknown,
      M.ManifestContactInformation
    > = {
      encode: input => ({
        address_line: undefinedToNull(input.addressLine),
        email:
          input.email !== undefined
            ? input.email.map(manifestAnnotatedStringEncoder.encode)
            : null,
        phone:
          input.phone !== undefined
            ? input.phone.map(manifestAnnotatedStringEncoder.encode)
            : null,
        name: undefinedToNull(input.name),
      }),
    };

    this.manifestContactInformationCodec = C.make(
      manifestContactInformationDecoder,
      manifestContactInformationEncoder
    );

    const manifestGeopoliticalUnitDecoder: D.Decoder<
      unknown,
      M.ManifestGeopoliticalUnit
    > = pipe(
      D.struct({
        object_id: D.string,
        name: D.string,
        type: manifestReportingUnitTypeDecoder,
      }),
      D.intersect(
        D.partial({
          contact_information: D.nullable(manifestContactInformationDecoder),
        })
      ),
      D.map(
        s =>
          new M.ManifestGeopoliticalUnit(
            context,
            s.object_id,
            s.name,
            s.type,
            nullToUndefined(s.contact_information)
          )
      )
    );

    const manifestGeopoliticalUnitEncoder: E.Encoder<
      unknown,
      M.ManifestGeopoliticalUnit
    > = {
      encode: input => ({
        object_id: input.objectId,
        name: input.name,
        type: input.type,
        contact_information:
          input.contactInformation !== undefined
            ? manifestContactInformationEncoder.encode(input.contactInformation)
            : null,
      }),
    };

    this.manifestGeopoliticalUnitCodec = C.make(
      manifestGeopoliticalUnitDecoder,
      manifestGeopoliticalUnitEncoder
    );

    const manifestCandidateDecoder: D.Decoder<unknown, M.ManifestCandidate> =
      pipe(
        D.struct({
          object_id: D.string,
        }),
        D.intersect(
          D.partial({
            name: manifestInternationalizedTextDecoder,
            party_id: D.nullable(D.string),
            image_uri: D.nullable(D.string),
            is_write_in: D.nullable(D.boolean),
          })
        ),
        D.map(
          s =>
            new M.ManifestCandidate(
              context,
              s.object_id,
              s.name,
              nullToUndefined(s.party_id),
              nullToUndefined(s.image_uri),
              nullToUndefined(s.is_write_in)
            )
        )
      );

    const manifestCandidateEncoder: E.Encoder<unknown, M.ManifestCandidate> = {
      encode: input => ({
        object_id: input.objectId,
        name: manifestInternationalizedTextEncoder.encode(input.name),
        party_id: undefinedToNull(input.partyId),
        image_uri: undefinedToNull(input.imageUri),
        is_write_in: undefinedToNull(input.isWriteIn),
      }),
    };

    this.manifestCandidateCodec = C.make(
      manifestCandidateDecoder,
      manifestCandidateEncoder
    );

    const manifestPartyDecoder: D.Decoder<unknown, M.ManifestParty> = pipe(
      D.struct({
        object_id: D.string,
      }),
      D.intersect(
        D.partial({
          name: manifestInternationalizedTextDecoder,
          abbreviation: D.nullable(D.string),
          color: D.nullable(D.string),
          logo_uri: D.nullable(D.string),
        })
      ),
      D.map(
        s =>
          new M.ManifestParty(
            context,
            s.object_id,
            s.name,
            nullToUndefined(s.abbreviation),
            nullToUndefined(s.color),
            nullToUndefined(s.logo_uri)
          )
      )
    );

    const manifestPartyEncoder: E.Encoder<unknown, M.ManifestParty> = {
      encode: input => ({
        object_id: input.objectId,
        name: manifestInternationalizedTextEncoder.encode(input.name),
        abbreviation: undefinedToNull(input.abbreviation),
        color: undefinedToNull(input.color),
        logo_uri: undefinedToNull(input.logoUri),
      }),
    };

    this.manifestPartyCodec = C.make(
      manifestPartyDecoder,
      manifestPartyEncoder
    );

    const manifestBallotStyleDecoder: D.Decoder<
      unknown,
      M.ManifestBallotStyle
    > = pipe(
      D.struct({
        object_id: D.string,
      }),
      D.intersect(
        D.partial({
          geopolitical_unit_ids: D.nullable(D.array(D.string)),
          party_ids: D.nullable(D.array(D.string)),
          image_uri: D.nullable(D.string),
        })
      ),
      D.map(
        s =>
          new M.ManifestBallotStyle(
            context,
            s.object_id,
            nullToUndefined(s.geopolitical_unit_ids),
            nullToUndefined(s.party_ids),
            nullToUndefined(s.image_uri)
          )
      )
    );

    const manifestBallotStyleEncoder: E.Encoder<
      unknown,
      M.ManifestBallotStyle
    > = {
      encode: input => ({
        object_id: input.objectId,
        geopolitical_unit_ids: undefinedToNull(input.geopoliticalUnitIds),
        party_ids: undefinedToNull(input.partyIds),
        image_uri: undefinedToNull(input.imageUri),
      }),
    };

    this.manifestBallotStyleCodec = C.make(
      manifestBallotStyleDecoder,
      manifestBallotStyleEncoder
    );

    const manifestContestDescriptionDecoder: D.Decoder<
      unknown,
      M.ManifestContestDescription
    > = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        electoral_district_id: D.string,
        vote_variation: D.string,
        number_elected: D.number,
        name: D.string,
      }),
      D.intersect(
        D.partial({
          votes_allowed: D.nullable(D.number),
          ballot_selections: D.array(manifestSelectionDescriptionDecoder),
          ballot_title: D.nullable(manifestInternationalizedTextDecoder),
          ballot_subtitle: D.nullable(manifestInternationalizedTextDecoder),
          primary_party_ids: D.array(D.string),
        })
      ),
      D.map(s => {
        const props = [
          s.object_id,
          s.sequence_order,
          s.electoral_district_id,
          s.vote_variation,
          s.number_elected,
          nullToUndefined(s.votes_allowed),
          s.name,
          s.ballot_selections,
          nullToUndefined(s.ballot_title),
          nullToUndefined(s.ballot_subtitle),
        ] as const;

        if (s.primary_party_ids !== undefined) {
          return new M.ManifestCandidateContestDescription(
            context,
            ...props,
            s.primary_party_ids
          );
        }

        return new M.ManifestContestDescription(context, ...props);
      })
    );

    const manifestContestDescriptionEncoder: E.Encoder<
      unknown,
      M.ManifestContestDescription
    > = {
      encode: input => ({
        object_id: input.objectId,
        sequence_order: input.sequenceOrder,
        electoral_district_id: input.geopoliticalUnitId,
        vote_variation: input.voteVariation,
        number_elected: input.numberElected,
        votes_allowed: undefinedToNull(input.votesAllowed),
        name: input.name,
        ballot_selections: input.selections.map(
          manifestSelectionDescriptionEncoder.encode
        ),
        ballot_title:
          input.ballotTitle !== undefined
            ? manifestInternationalizedTextEncoder.encode(input.ballotTitle)
            : null,
        ballot_subtitle:
          input.ballotSubtitle !== undefined
            ? manifestInternationalizedTextEncoder.encode(input.ballotSubtitle)
            : null,
      }),
    };

    this.manifestContestDescriptionCodec = C.make(
      manifestContestDescriptionDecoder,
      manifestContestDescriptionEncoder
    );

    const manifestCandidateContestDescriptionDecoder: D.Decoder<
      unknown,
      M.ManifestCandidateContestDescription
    > = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        electoral_district_id: D.string,
        vote_variation: manifestVoteVariationTypeDecoder,
        number_elected: D.number,
        name: D.string,
        ballot_selections: D.array(manifestSelectionDescriptionDecoder),
      }),
      D.intersect(
        D.partial({
          votes_allowed: D.nullable(D.number),
          ballot_title: D.nullable(manifestInternationalizedTextDecoder),
          ballot_subtitle: D.nullable(manifestInternationalizedTextDecoder),
          primary_party_ids: D.array(D.string),
        })
      ),
      D.map(
        s =>
          new M.ManifestCandidateContestDescription(
            context,
            s.object_id,
            s.sequence_order,
            s.electoral_district_id,
            s.vote_variation,
            s.number_elected,
            nullToUndefined(s.votes_allowed),
            s.name,
            s.ballot_selections,
            nullToUndefined(s.ballot_title),
            nullToUndefined(s.ballot_subtitle),
            s.primary_party_ids
          )
      )
    );

    const manifestCandidateContestDescriptionEncoder: E.Encoder<
      unknown,
      M.ManifestCandidateContestDescription
    > = {
      encode: input => ({
        ...(manifestContestDescriptionEncoder.encode(input) as Object),
        primary_party_ids: undefinedToNull(input.primaryPartyIds),
      }),
    };

    this.manifestCandidateContestDescriptionCodec = C.make(
      manifestCandidateContestDescriptionDecoder,
      manifestCandidateContestDescriptionEncoder
    );

    const manifestDecoder: D.Decoder<unknown, M.Manifest> = pipe(
      D.struct({
        election_scope_id: D.string,
        spec_version: D.string,
        type: manifestElectionTypeDecoder,
        start_date: D.string,
        end_date: D.string,
        geopolitical_units: D.array(manifestGeopoliticalUnitDecoder),
        parties: D.array(manifestPartyDecoder),
        candidates: D.array(manifestCandidateDecoder),
        contests: D.array(manifestContestDescriptionDecoder),
        ballot_styles: D.array(manifestBallotStyleDecoder),
      }),
      D.intersect(
        D.partial({
          name: D.nullable(manifestInternationalizedTextDecoder),
          contact_information: D.nullable(manifestContactInformationDecoder),
        })
      ),
      D.map(
        s =>
          new M.Manifest(
            context,
            s.election_scope_id,
            s.spec_version,
            s.type,
            s.start_date,
            s.end_date,
            s.geopolitical_units,
            s.parties,
            s.candidates,
            s.contests,
            s.ballot_styles,
            nullToUndefined(s.name),
            nullToUndefined(s.contact_information)
          )
      )
    );

    const manifestEncoder: E.Encoder<unknown, M.Manifest> = {
      encode: input => ({
        election_scope_id: input.electionScopeId,
        spec_version: input.specVersion,
        type: input.electionType,
        start_date: input.startDate, // TODO: Should we normalize to ISO 8601?
        end_date: input.endDate, // TODO: Should we normalize to ISO 8601?
        geopolitical_units: input.geopoliticalUnits.map(
          manifestGeopoliticalUnitEncoder.encode
        ),
        parties: input.parties.map(manifestPartyEncoder.encode),
        candidates: input.candidates.map(manifestCandidateEncoder.encode),
        contests: input.contests.map(c =>
          c instanceof M.ManifestCandidateContestDescription
            ? manifestCandidateContestDescriptionEncoder.encode(c)
            : manifestContestDescriptionEncoder.encode(c)
        ),
        ballot_styles: input.ballotStyles.map(
          manifestBallotStyleEncoder.encode
        ),
        name:
          input.name !== undefined
            ? manifestInternationalizedTextEncoder.encode(input.name)
            : null,
        contact_information:
          input.contactInformation !== undefined
            ? manifestContactInformationEncoder.encode(input.contactInformation)
            : null,
      }),
    };

    this.manifestCodec = C.make(manifestDecoder, manifestEncoder);

    const submittedSelectionDecoder: D.Decoder<unknown, SubmittedSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: this.coreCodecs.elementModQCodec,
          ciphertext: this.coreCodecs.elGamalCiphertextCodec,
          crypto_hash: this.coreCodecs.elementModQCodec,
          // nullable and omittable in electionguard-python
          proof: this.coreCodecs.disjunctiveChaumPedersenProofKnownNonceCodec,
        }),
        D.intersect(
          D.partial({
            is_placeholder_selection: D.boolean,
            // supposed to be `null`, but we don't complain if it's missing or not null
            nonce: D.nullable(D.string),
          })
        ),
        D.map(
          s =>
            new SubmittedSelection(
              s.object_id,
              s.sequence_order,
              s.description_hash,
              s.ciphertext,
              s.crypto_hash,
              s.is_placeholder_selection,
              s.proof
            )
        )
      );

    const submittedSelectionEncoder: E.Encoder<unknown, SubmittedSelection> = {
      encode: input => ({
        object_id: input.objectId,
        sequence_order: input.sequenceOrder,
        description_hash: this.coreCodecs.elementModQCodec.encode(
          input.selectionHash
        ),
        ciphertext: this.coreCodecs.elGamalCiphertextCodec.encode(
          input.ciphertext
        ),
        crypto_hash: this.coreCodecs.elementModQCodec.encode(input.cryptoHash),
        is_placeholder_selection: input.isPlaceholderSelection,
        proof:
          input.proof !== undefined
            ? this.coreCodecs.disjunctiveChaumPedersenProofKnownNonceCodec.encode(
                input.proof
              )
            : null,
        nonce: null,
      }),
    };

    this.submittedSelectionCodec = C.make(
      submittedSelectionDecoder,
      submittedSelectionEncoder
    );

    const submittedContestDecoder: D.Decoder<unknown, SubmittedContest> = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        description_hash: this.coreCodecs.elementModQCodec,
        ballot_selections: D.array(submittedSelectionDecoder),
        ciphertext_accumulation: this.coreCodecs.elGamalCiphertextCodec,
        crypto_hash: this.coreCodecs.elementModQCodec,
        // nullable and omittable in electionguard-python
        proof: this.coreCodecs.constantChaumPedersenProofKnownNonceCodec,
      }),
      D.intersect(
        D.partial({
          extended_data: D.nullable(
            this.coreCodecs.hashedElGamalCiphertextCompatCodec
          ),
        })
      ),
      D.map(
        s =>
          new SubmittedContest(
            s.object_id,
            s.sequence_order,
            s.description_hash,
            s.ballot_selections,
            s.ciphertext_accumulation,
            s.crypto_hash,
            s.proof,
            nullToUndefined(s.extended_data)
          )
      )
    );

    const submittedContestEncoder: E.Encoder<unknown, SubmittedContest> = {
      encode: input => ({
        object_id: input.objectId,
        sequence_order: input.sequenceOrder,
        description_hash: this.coreCodecs.elementModQCodec.encode(
          input.contestHash
        ),
        ballot_selections: input.selections.map(
          submittedSelectionEncoder.encode
        ),
        ciphertext_accumulation: this.coreCodecs.elGamalCiphertextCodec.encode(
          input.ciphertextAccumulation
        ),
        crypto_hash: this.coreCodecs.elementModQCodec.encode(input.cryptoHash),
        proof: this.coreCodecs.constantChaumPedersenProofKnownNonceCodec.encode(
          input.proof
        ),
        extended_data:
          input.extendedData !== undefined
            ? this.coreCodecs.hashedElGamalCiphertextCompatCodec.encode(
                input.extendedData
              )
            : null,
        nonce: null,
      }),
    };

    this.submittedContestCodec = C.make(
      submittedContestDecoder,
      submittedContestEncoder
    );

    const submittedBallotDecoder: D.Decoder<unknown, SubmittedBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        manifest_hash: this.coreCodecs.elementModQCodec,
        code_seed: this.coreCodecs.elementModQCodec,
        contests: D.array(submittedContestDecoder),
        code: this.coreCodecs.elementModQCodec,
        timestamp: D.number,
        crypto_hash: this.coreCodecs.elementModQCodec,
        state: D.number,
      }),
      D.intersect(
        D.partial({
          nonce: D.nullable(D.string),
        })
      ),
      D.map(
        s =>
          new SubmittedBallot(
            s.object_id,
            s.style_id,
            s.manifest_hash,
            s.code_seed,
            s.code,
            s.contests,
            s.timestamp,
            s.crypto_hash,
            s.state
          )
      )
    );

    const submittedBallotEncoder: E.Encoder<unknown, SubmittedBallot> = {
      encode: input => ({
        object_id: input.objectId,
        style_id: input.ballotStyleId,
        manifest_hash: this.coreCodecs.elementModQCodec.encode(
          input.manifestHash
        ),
        code_seed: this.coreCodecs.elementModQCodec.encode(input.codeSeed),
        code: this.coreCodecs.elementModQCodec.encode(input.code),
        contests: input.contests.map(submittedContestEncoder.encode),
        timestamp: input.timestamp,
        crypto_hash: this.coreCodecs.elementModQCodec.encode(input.cryptoHash),
        state: input.state,
        nonce: null,
      }),
    };

    this.submittedBallotCodec = C.make(
      submittedBallotDecoder,
      submittedBallotEncoder
    );

    const ciphertextSelectionDecoder: D.Decoder<unknown, CiphertextSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: this.coreCodecs.elementModQCodec,
          ciphertext: this.coreCodecs.elGamalCiphertextCodec,
          crypto_hash: this.coreCodecs.elementModQCodec,
          // nullable and omittable in electionguard-python
          proof: this.coreCodecs.disjunctiveChaumPedersenProofKnownNonceCodec,
        }),
        D.intersect(
          D.partial({
            is_placeholder_selection: D.boolean,
            nonce: D.nullable(this.coreCodecs.elementModQCodec),
          })
        ),
        D.map(
          s =>
            new CiphertextSelection(
              s.object_id,
              s.sequence_order,
              s.description_hash,
              s.ciphertext,
              s.crypto_hash,
              s.is_placeholder_selection,
              s.proof,
              nullToUndefined(s.nonce)
            )
        )
      );

    const ciphertextSelectionEncoder: E.Encoder<unknown, CiphertextSelection> =
      {
        encode: input => ({
          object_id: input.objectId,
          sequence_order: input.sequenceOrder,
          description_hash: this.coreCodecs.elementModQCodec.encode(
            input.selectionHash
          ),
          ciphertext: this.coreCodecs.elGamalCiphertextCodec.encode(
            input.ciphertext
          ),
          crypto_hash: this.coreCodecs.elementModQCodec.encode(
            input.cryptoHash
          ),
          is_placeholder_selection: input.isPlaceholderSelection,
          proof:
            this.coreCodecs.disjunctiveChaumPedersenProofKnownNonceCodec.encode(
              input.proof
            ),
          nonce:
            input.selectionNonce !== undefined
              ? this.coreCodecs.elementModQCodec.encode(input.selectionNonce)
              : null,
        }),
      };

    this.ciphertextSelectionCodec = C.make(
      ciphertextSelectionDecoder,
      ciphertextSelectionEncoder
    );

    const ciphertextContestDecoder: D.Decoder<unknown, CiphertextContest> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: this.coreCodecs.elementModQCodec,
          ballot_selections: D.array(ciphertextSelectionDecoder),
          ciphertext_accumulation: this.coreCodecs.elGamalCiphertextCodec,
          crypto_hash: this.coreCodecs.elementModQCodec,
          // nullable and omittable in electionguard-python
          proof: this.coreCodecs.constantChaumPedersenProofKnownNonceCodec,
          // nullable and omittable in electionguard-python
          nonce: this.coreCodecs.elementModQCodec,
        }),
        D.intersect(
          D.partial({
            extended_data: D.nullable(
              this.coreCodecs.hashedElGamalCiphertextCompatCodec
            ),
          })
        ),
        D.map(
          s =>
            new CiphertextContest(
              s.object_id,
              s.sequence_order,
              s.description_hash,
              s.ballot_selections,
              s.ciphertext_accumulation,
              s.crypto_hash,
              s.proof,
              s.nonce,
              nullToUndefined(s.extended_data)
            )
        )
      );

    const ciphertextContestEncoder: E.Encoder<unknown, CiphertextContest> = {
      encode: input => ({
        object_id: input.objectId,
        sequence_order: input.sequenceOrder,
        description_hash: this.coreCodecs.elementModQCodec.encode(
          input.contestHash
        ),
        ballot_selections: input.selections.map(
          ciphertextSelectionEncoder.encode
        ),
        ciphertext_accumulation: this.coreCodecs.elGamalCiphertextCodec.encode(
          input.ciphertextAccumulation
        ),
        crypto_hash: this.coreCodecs.elementModQCodec.encode(input.cryptoHash),
        proof: this.coreCodecs.constantChaumPedersenProofKnownNonceCodec.encode(
          input.proof
        ),
        nonce: this.coreCodecs.elementModQCodec.encode(input.contestNonce),
        extended_data:
          input.extendedData !== undefined
            ? this.coreCodecs.hashedElGamalCiphertextCompatCodec.encode(
                input.extendedData
              )
            : null,
      }),
    };

    this.ciphertextContestCodec = C.make(
      ciphertextContestDecoder,
      ciphertextContestEncoder
    );

    const ciphertextBallotDecoder: D.Decoder<unknown, CiphertextBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        manifest_hash: this.coreCodecs.elementModQCodec,
        code_seed: this.coreCodecs.elementModQCodec,
        contests: D.array(ciphertextContestDecoder),
        code: this.coreCodecs.elementModQCodec,
        timestamp: D.number,
        crypto_hash: this.coreCodecs.elementModQCodec,
        // nullable and omittable in electionguard-python
        nonce: this.coreCodecs.elementModQCodec,
      }),
      D.map(
        s =>
          new CiphertextBallot(
            s.object_id,
            s.style_id,
            s.manifest_hash,
            s.code_seed,
            s.code,
            s.contests,
            s.timestamp,
            s.crypto_hash,
            s.nonce
          )
      )
    );

    const ciphertextBallotEncoder: E.Encoder<unknown, CiphertextBallot> = {
      encode: input => ({
        object_id: input.objectId,
        style_id: input.ballotStyleId,
        manifest_hash: this.coreCodecs.elementModQCodec.encode(
          input.manifestHash
        ),
        code_seed: this.coreCodecs.elementModQCodec.encode(input.codeSeed),
        code: this.coreCodecs.elementModQCodec.encode(input.code),
        contests: input.contests.map(ciphertextContestEncoder.encode),
        timestamp: input.timestamp,
        crypto_hash: this.coreCodecs.elementModQCodec.encode(input.cryptoHash),
        nonce: this.coreCodecs.elementModQCodec.encode(
          input.ballotEncryptionSeed
        ),
      }),
    };

    this.ciphertextBallotCodec = C.make(
      ciphertextBallotDecoder,
      ciphertextBallotEncoder
    );

    const plaintextSelectionDecoder: D.Decoder<unknown, PlaintextSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          vote: D.literal(0, 1),
        }),
        D.intersect(
          D.partial({
            is_placeholder_selection: D.boolean,
            write_in: D.nullable(D.string),
          })
        ),
        D.map(
          s =>
            new PlaintextSelection(
              s.object_id,
              s.vote,
              nullToUndefined(s.is_placeholder_selection),
              nullToUndefined(s.write_in)
            )
        )
      );

    const plaintextSelectionEncoder: E.Encoder<unknown, PlaintextSelection> = {
      encode: input => ({
        object_id: input.objectId,
        vote: input.vote,
        is_placeholder_selection: input.isPlaceholderSelection,
        write_in: undefinedToNull(input.writeIn),
      }),
    };

    this.plaintextSelectionCodec = C.make(
      plaintextSelectionDecoder,
      plaintextSelectionEncoder
    );

    const plaintextContestDecoder: D.Decoder<unknown, PlaintextContest> = pipe(
      D.struct({
        object_id: D.string,
      }),
      D.intersect(
        D.partial({
          ballot_selections: D.array(plaintextSelectionDecoder),
        })
      ),
      D.map(s => new PlaintextContest(s.object_id, s.ballot_selections))
    );

    const plaintextContestEncoder: E.Encoder<unknown, PlaintextContest> = {
      encode: input => ({
        object_id: input.objectId,
        ballot_selections: input.selections.map(
          plaintextSelectionEncoder.encode
        ),
      }),
    };

    this.plaintextContestCodec = C.make(
      plaintextContestDecoder,
      plaintextContestEncoder
    );

    const plaintextBallotDecoder: D.Decoder<unknown, PlaintextBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        contests: D.array(plaintextContestDecoder),
      }),
      D.map(s => new PlaintextBallot(s.object_id, s.style_id, s.contests))
    );

    const plaintextBallotEncoder: E.Encoder<unknown, PlaintextBallot> = {
      encode: input => ({
        object_id: input.objectId,
        style_id: input.ballotStyleId,
        contests: input.contests.map(plaintextContestEncoder.encode),
      }),
    };

    this.plaintextBallotCodec = C.make(
      plaintextBallotDecoder,
      plaintextBallotEncoder
    );

    const encryptionStateDecoder: D.Decoder<unknown, EncryptionState> = pipe(
      D.struct({
        public_key: this.coreCodecs.elGamalPublicKeyCodec,
        extended_base_hash: this.coreCodecs.elementModQCodec,
        manifest: manifestDecoder,
        context: this.coreCodecs.electionContextCodec,
      }),
      D.map(s => new EncryptionState(context, s.manifest, s.context, true))
    );

    const encryptionStateEncoder: E.Encoder<unknown, EncryptionState> = {
      encode: input => ({
        public_key: this.coreCodecs.elGamalPublicKeyCodec.encode(
          input.publicKey
        ),
        extended_base_hash: this.coreCodecs.elementModQCodec.encode(
          input.extendedBaseHash
        ),
        manifest: manifestEncoder.encode(input.manifest),
        context: this.coreCodecs.electionContextCodec.encode(input.context),
      }),
    };

    this.encryptionStateCodec = C.make(
      encryptionStateDecoder,
      encryptionStateEncoder
    );
  }
}

const codecs = new Map<string, BallotCodecs>();

export function getBallotCodecsForContext(context: GroupContext): BallotCodecs {
  let result = codecs.get(context.name);
  if (result === undefined) {
    result = new BallotCodecs(context);
    codecs.set(context.name, new BallotCodecs(context));
  }
  return result;
}
