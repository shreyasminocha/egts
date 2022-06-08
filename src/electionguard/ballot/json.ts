import * as D from 'io-ts/Decoder';
import * as E from 'io-ts/Encoder';
import * as C from 'io-ts/Codec';
import {pipe} from 'fp-ts/function';
import {GroupContext} from '../core/group-common';
import * as Manifest from './manifest';
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
  ExtendedData,
} from './plaintext-ballot';
import {getCodecsForContext as getCoreCodecsForContext} from '../core/json';

// These JSON importer/exporter things are using the io-ts package:
// https://github.com/gcanti/io-ts/
// Which, in turn, uses a functional progrmaming library:
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
class Codecs {
  readonly ManifestLanguageCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestLanguage
  >;
  readonly ManifestInternationalizedTextCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestInternationalizedText
  >;
  readonly ManifestSelectionDescriptionCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestSelectionDescription
  >;
  readonly ManifestAnnotatedStringCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestAnnotatedString
  >;
  readonly ManifestContactInformationCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestContactInformation
  >;
  readonly ManifestGeopoliticalUnitCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestGeopoliticalUnit
  >;
  readonly ManifestCandidateCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestCandidate
  >;
  readonly ManifestPartyCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestParty
  >;
  readonly ManifestBallotStyleCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestBallotStyle
  >;
  readonly ManifestCodec: C.Codec<unknown, unknown, Manifest.Manifest>;
  readonly ManifestContestDescriptionCodec: C.Codec<
    unknown,
    unknown,
    Manifest.ManifestContestDescription
  >;
  readonly SubmittedContestCodec: C.Codec<unknown, unknown, SubmittedContest>;
  readonly SubmittedSelectionCodec: C.Codec<
    unknown,
    unknown,
    SubmittedSelection
  >;
  readonly SubmittedBallotCodec: C.Codec<unknown, unknown, SubmittedBallot>;
  readonly CiphertextSelectionCodec: C.Codec<
    unknown,
    unknown,
    CiphertextSelection
  >;
  readonly CiphertextContestCodec: C.Codec<unknown, unknown, CiphertextContest>;
  readonly CiphertextBallotCodec: C.Codec<unknown, unknown, CiphertextBallot>;
  readonly ExtendedDataCodec: C.Codec<unknown, unknown, ExtendedData>;
  readonly PlaintextSelectionCodec: C.Codec<
    unknown,
    unknown,
    PlaintextSelection
  >;
  readonly PlaintextContestCodec: C.Codec<unknown, unknown, PlaintextContest>;
  readonly PlaintextBallotCodec: C.Codec<unknown, unknown, PlaintextBallot>;

  constructor(readonly context: GroupContext) {
    const ManifestLanguageDecoder: D.Decoder<
      unknown,
      Manifest.ManifestLanguage
    > = pipe(
      D.struct({
        value: D.string,
        language: D.string,
      }),
      D.map(s => new Manifest.ManifestLanguage(context, s.value, s.language))
    );

    const ManifestLanguageEncoder: E.Encoder<
      unknown,
      Manifest.ManifestLanguage
    > = {
      encode: input => ({
        value: input.value,
        language: input.language,
      }),
    };

    this.ManifestLanguageCodec = C.make(
      ManifestLanguageDecoder,
      ManifestLanguageEncoder
    );

    const ManifestInternationalizedTextDecoder: D.Decoder<
      unknown,
      Manifest.ManifestInternationalizedText
    > = pipe(
      D.struct({
        text: D.array(ManifestLanguageDecoder),
      }),
      D.map(s => new Manifest.ManifestInternationalizedText(context, s.text))
    );

    const ManifestInternationalizedTextEncoder: E.Encoder<
      unknown,
      Manifest.ManifestInternationalizedText
    > = {
      encode: input => ({
        text: input.text,
      }),
    };

    this.ManifestInternationalizedTextCodec = C.make(
      ManifestInternationalizedTextDecoder,
      ManifestInternationalizedTextEncoder
    );

    const ManifestSelectionDescriptionDecoder: D.Decoder<
      unknown,
      Manifest.ManifestSelectionDescription
    > = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        candidate_id: D.string,
      }),
      D.map(
        s =>
          new Manifest.ManifestSelectionDescription(
            context,
            s.object_id,
            s.sequence_order,
            s.candidate_id
          )
      )
    );

    const ManifestSelectionDescriptionEncoder: E.Encoder<
      unknown,
      Manifest.ManifestSelectionDescription
    > = {
      encode: input => ({
        object_id: input.selectionId,
        sequence_order: input.sequenceOrder,
        candidate_id: input.candidateId,
      }),
    };

    this.ManifestSelectionDescriptionCodec = C.make(
      ManifestSelectionDescriptionDecoder,
      ManifestSelectionDescriptionEncoder
    );

    const ManifestAnnotatedStringDecoder: D.Decoder<
      unknown,
      Manifest.ManifestAnnotatedString
    > = pipe(
      D.struct({
        annotation: D.string,
        value: D.string,
      }),
      D.map(
        s =>
          new Manifest.ManifestAnnotatedString(context, s.annotation, s.value)
      )
    );

    const ManifestAnnotatedStringEncoder: E.Encoder<
      unknown,
      Manifest.ManifestAnnotatedString
    > = {
      encode: input => ({
        annotation: input.annotation,
        value: input.value,
      }),
    };

    this.ManifestAnnotatedStringCodec = C.make(
      ManifestAnnotatedStringDecoder,
      ManifestAnnotatedStringEncoder
    );

    const ManifestContactInformationDecoder: D.Decoder<
      unknown,
      Manifest.ManifestContactInformation
    > = pipe(
      D.struct({
        address_line: D.array(D.string),
        email: D.array(ManifestAnnotatedStringDecoder),
        phone: D.array(ManifestAnnotatedStringDecoder),
        name: D.string,
      }),
      D.map(
        s =>
          new Manifest.ManifestContactInformation(
            context,
            s.address_line,
            s.email,
            s.phone,
            s.name
          )
      )
    );

    const ManifestContactInformationEncoder: E.Encoder<
      unknown,
      Manifest.ManifestContactInformation
    > = {
      encode: input => ({
        address_line: input.addressLine,
        email: input.email,
        phone: input.phone,
        name: input.name,
      }),
    };

    this.ManifestContactInformationCodec = C.make(
      ManifestContactInformationDecoder,
      ManifestContactInformationEncoder
    );

    const ManifestGeopoliticalUnitDecoder: D.Decoder<
      unknown,
      Manifest.ManifestGeopoliticalUnit
    > = pipe(
      D.struct({
        object_id: D.string,
        name: D.string,
        type: D.number,
        contact_information: ManifestContactInformationDecoder,
      }),
      D.map(
        s =>
          new Manifest.ManifestGeopoliticalUnit(
            context,
            s.object_id,
            s.name,
            s.type as Manifest.ManifestReportingUnitType,
            s.contact_information
          )
      )
    );

    const ManifestGeopoliticalUnitEncoder: E.Encoder<
      unknown,
      Manifest.ManifestGeopoliticalUnit
    > = {
      encode: input => ({
        object_id: input.objectId,
        name: input.name,
        type: input.type,
        contact_information: input.contactInformation,
      }),
    };

    this.ManifestGeopoliticalUnitCodec = C.make(
      ManifestGeopoliticalUnitDecoder,
      ManifestGeopoliticalUnitEncoder
    );

    const ManifestCandidateDecoder: D.Decoder<
      unknown,
      Manifest.ManifestCandidate
    > = pipe(
      D.struct({
        object_id: D.string,
        name: ManifestInternationalizedTextDecoder,
        party_id: D.string,
        image_uri: D.string,
        is_write_in: D.boolean,
      }),
      D.map(
        s =>
          new Manifest.ManifestCandidate(
            context,
            s.object_id,
            s.name,
            s.party_id,
            s.image_uri,
            s.is_write_in
          )
      )
    );

    const ManifestCandidateEncoder: E.Encoder<
      unknown,
      Manifest.ManifestCandidate
    > = {
      encode: input => ({
        object_id: input.candidateId,
        name: input.name,
        party_id: input.partyId,
        image_uri: input.imageUri,
        is_write_in: input.isWriteIn,
      }),
    };

    this.ManifestCandidateCodec = C.make(
      ManifestCandidateDecoder,
      ManifestCandidateEncoder
    );

    const ManifestPartyDecoder: D.Decoder<unknown, Manifest.ManifestParty> =
      pipe(
        D.struct({
          object_id: D.string,
          name: ManifestInternationalizedTextDecoder,
          abbreviation: D.string,
          color: D.string,
          logo_uri: D.string,
        }),
        D.map(
          s =>
            new Manifest.ManifestParty(
              context,
              s.object_id,
              s.name,
              s.abbreviation,
              s.color,
              s.logo_uri
            )
        )
      );

    const ManifestPartyEncoder: E.Encoder<unknown, Manifest.ManifestParty> = {
      encode: input => ({
        object_id: input.partyId,
        name: input.name,
        abbreviation: input.abbreviation,
        color: input.color,
        logo_uri: input.logoUri,
      }),
    };

    this.ManifestPartyCodec = C.make(
      ManifestPartyDecoder,
      ManifestPartyEncoder
    );

    const ManifestBallotStyleDecoder: D.Decoder<
      unknown,
      Manifest.ManifestBallotStyle
    > = pipe(
      D.struct({
        object_id: D.string,
        geopolitical_unit_ids: D.array(D.string),
        party_ids: D.array(D.string),
        image_uri: D.string,
      }),
      D.map(
        s =>
          new Manifest.ManifestBallotStyle(
            context,
            s.object_id,
            s.geopolitical_unit_ids,
            s.party_ids,
            s.image_uri
          )
      )
    );

    const ManifestBallotStyleEncoder: E.Encoder<
      unknown,
      Manifest.ManifestBallotStyle
    > = {
      encode: input => ({
        object_id: input.ballotStyleId,
        geopolitical_unit_ids: JSON.stringify(input.geopoliticalUnitIds),
        party_ids: JSON.stringify(input.partyIds),
        image_uri: input.imageUri,
      }),
    };

    this.ManifestBallotStyleCodec = C.make(
      ManifestBallotStyleDecoder,
      ManifestBallotStyleEncoder
    );

    const ManifestContestDescriptionDecoder: D.Decoder<
      unknown,
      Manifest.ManifestContestDescription
    > = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        electoral_district_id: D.string,
        vote_variation: D.number,
        number_elected: D.number,
        votes_allowed: D.number,
        name: D.string,
        ballot_selections: D.array(ManifestSelectionDescriptionDecoder),
        ballot_title: ManifestInternationalizedTextDecoder,
        ballot_subtitle: ManifestInternationalizedTextDecoder,
      }),
      D.map(
        s =>
          new Manifest.ManifestContestDescription(
            context,
            s.object_id,
            s.sequence_order,
            s.electoral_district_id,
            s.vote_variation as Manifest.ManifestVoteVariationType,
            s.number_elected,
            s.votes_allowed,
            s.name,
            s.ballot_selections,
            s.ballot_title,
            s.ballot_subtitle
          )
      )
    );

    const ManifestContestDescriptionEncoder: E.Encoder<
      unknown,
      Manifest.ManifestContestDescription
    > = {
      encode: input => ({
        object_id: input.contestId,
        sequence_order: input.sequenceOrder,
        electoral_district_id: input.geopoliticalUnitId,
        vote_variation: Manifest.ManifestVoteVariationType[input.voteVariation],
        number_elected: input.numberElected,
        votes_allowed: input.votesAllowed,
        name: input.name,
        ballot_selections: JSON.stringify(
          input.selections.map(ManifestSelectionDescriptionEncoder.encode)
        ),
        ballot_title:
          input.ballotTitle &&
          ManifestInternationalizedTextEncoder.encode(input.ballotTitle),
        ballot_subtitle:
          input.ballotSubtitle &&
          ManifestInternationalizedTextEncoder.encode(input.ballotSubtitle),
      }),
    };

    this.ManifestContestDescriptionCodec = C.make(
      ManifestContestDescriptionDecoder,
      ManifestContestDescriptionEncoder
    );

    const ManifestDecoder: D.Decoder<unknown, Manifest.Manifest> = pipe(
      D.struct({
        election_scope_id: D.string,
        spec_version: D.string,
        type: D.number,
        start_date: D.string,
        end_date: D.string,
        geopolitical_units: D.array(ManifestGeopoliticalUnitDecoder),
        parties: D.array(ManifestPartyDecoder),
        candidates: D.array(ManifestCandidateDecoder),
        contests: D.array(ManifestContestDescriptionDecoder),
        ballots: D.array(ManifestBallotStyleDecoder),
        name: ManifestInternationalizedTextDecoder,
        contact_information: ManifestContactInformationDecoder,
      }),
      D.map(
        s =>
          new Manifest.Manifest(
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
            s.ballots,
            s.name,
            s.contact_information
          )
      )
    );

    const ManifestEncoder: E.Encoder<unknown, Manifest.Manifest> = {
      encode: input => ({
        election_scope_id: input.electionScopeId,
        spec_version: input.specVersion,
        type: input.electionType,
        start_date: input.startDate,
        end_date: input.endDate,
        geopolitical_units: JSON.stringify(
          ManifestGeopoliticalUnitEncoder.encode
        ),
        parties: JSON.stringify(input.parties.map(ManifestPartyEncoder.encode)),
        candidates: JSON.stringify(
          input.candidates.map(ManifestCandidateEncoder.encode)
        ),
        contests: JSON.stringify(
          input.contests.map(ManifestContestDescriptionEncoder.encode)
        ),
        ballots: JSON.stringify(
          input.ballotStyles.map(ManifestBallotStyleEncoder.encode)
        ),
        name:
          input.name && ManifestInternationalizedTextEncoder.encode(input.name),
        contact_information:
          input.contactInformation &&
          ManifestContactInformationEncoder.encode(input.contactInformation),
      }),
    };

    this.ManifestCodec = C.make(ManifestDecoder, ManifestEncoder);

    const SubmittedSelectionDecoder: D.Decoder<unknown, SubmittedSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: getCoreCodecsForContext(context).elementModQCodec,
          ciphertext: getCoreCodecsForContext(context).elGamalCiphertextCodec,
          crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
          nonce: D.string,
          is_placeholder_selection: D.boolean,
          proof:
            getCoreCodecsForContext(context)
              .disjunctiveChaumPedersenProofKnownNonceCodec,
          extended_data: D.string,
        }),
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

    const SubmittedSelectionEncoder: E.Encoder<unknown, SubmittedSelection> = {
      encode: input => ({
        object_id: input.selectionId,
        sequence_order: input.sequenceOrder,
        description_hash: getCoreCodecsForContext(
          context
        ).elementModQCodec.encode(input.selectionHash),
        ciphertext: getCoreCodecsForContext(
          context
        ).elGamalCiphertextCodec.encode(input.ciphertext),
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.cryptoHash
        ),
        is_placeholder_selection: input.isPlaceholderSelection,
        proof: getCoreCodecsForContext(
          context
        ).disjunctiveChaumPedersenProofKnownNonceCodec.encode(input.proof),
        extended_data:
          input.extendedData &&
          getCoreCodecsForContext(context).hashedElGamalCiphertextCodec.encode(
            input.extendedData
          ),
      }),
    };

    this.SubmittedSelectionCodec = C.make(
      SubmittedSelectionDecoder,
      SubmittedSelectionEncoder
    );

    const SubmittedContestDecoder: D.Decoder<unknown, SubmittedContest> = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        description_hash: getCoreCodecsForContext(context).elementModQCodec,
        ballot_selections: D.array(SubmittedSelectionDecoder),
        ciphertext_accumulation:
          getCoreCodecsForContext(context).elGamalCiphertextCodec,
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
        proof:
          getCoreCodecsForContext(context)
            .constantChaumPedersenProofKnownNonceCodec,
      }),
      D.map(
        s =>
          new SubmittedContest(
            s.object_id,
            s.sequence_order,
            s.description_hash,
            s.ballot_selections,
            s.ciphertext_accumulation,
            s.crypto_hash,
            s.proof
          )
      )
    );

    const SubmittedContestEncoder: E.Encoder<unknown, SubmittedContest> = {
      encode: input => ({
        object_id: input.contestId,
        sequence_order: input.sequenceOrder,
        description_hash: getCoreCodecsForContext(
          context
        ).elementModQCodec.encode(input.contestHash),
        ballot_selections: JSON.stringify(
          input.selections.map(SubmittedSelectionEncoder.encode)
        ),
        ciphertext_accumulation: getCoreCodecsForContext(
          context
        ).elGamalCiphertextCodec.encode(input.ciphertextAccumulation),
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.cryptoHash
        ),
        proof: getCoreCodecsForContext(
          context
        ).constantChaumPedersenProofKnownNonceCodec.encode(input.proof),
      }),
    };

    this.SubmittedContestCodec = C.make(
      SubmittedContestDecoder,
      SubmittedContestEncoder
    );

    const SubmittedBallotDecoder: D.Decoder<unknown, SubmittedBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        manifest_hash: getCoreCodecsForContext(context).elementModQCodec,
        code_hash: getCoreCodecsForContext(context).elementModQCodec,
        contests: D.array(SubmittedContestDecoder),
        code: getCoreCodecsForContext(context).elementModQCodec,
        timestamp: D.number,
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
        state: D.number,
      }),
      D.map(
        s =>
          new SubmittedBallot(
            s.object_id,
            s.style_id,
            s.manifest_hash,
            s.code_hash,
            s.code,
            s.contests,
            s.timestamp,
            s.crypto_hash,
            s.state
          )
      )
    );

    const SubmittedBallotEncoder: E.Encoder<unknown, SubmittedBallot> = {
      encode: input => ({
        object_id: input.ballotId,
        style_id: input.ballotStyleId,
        manifest_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.manifestHash
        ),
        code_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.codeSeed
        ),
        contests: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.code
        ),
        code: JSON.stringify(
          input.contests.map(SubmittedContestEncoder.encode)
        ),
        timestamp: input.timestamp,
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.cryptoHash
        ),
        state: input.state,
      }),
    };

    this.SubmittedBallotCodec = C.make(
      SubmittedBallotDecoder,
      SubmittedBallotEncoder
    );

    const CiphertextSelectionDecoder: D.Decoder<unknown, CiphertextSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: getCoreCodecsForContext(context).elementModQCodec,
          ciphertext: getCoreCodecsForContext(context).elGamalCiphertextCodec,
          crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
          nonce: getCoreCodecsForContext(context).elementModQCodec,
          is_placeholder_selection: D.boolean,
          proof:
            getCoreCodecsForContext(context)
              .disjunctiveChaumPedersenProofKnownNonceCodec,
          extended_data:
            getCoreCodecsForContext(context).hashedElGamalCiphertextCodec,
        }),
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
              s.nonce,
              s.extended_data
            )
        )
      );

    const CiphertextSelectionEncoder: E.Encoder<unknown, CiphertextSelection> =
      {
        encode: input => ({
          object_id: input.selectionId,
          sequence_order: input.sequenceOrder,
          description_hash: getCoreCodecsForContext(
            context
          ).elementModQCodec.encode(input.selectionHash),
          ciphertext: getCoreCodecsForContext(
            context
          ).elGamalCiphertextCodec.encode(input.ciphertext),
          crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
            input.cryptoHash
          ),
          is_placeholder_selection: input.isPlaceholderSelection,
          proof: getCoreCodecsForContext(
            context
          ).disjunctiveChaumPedersenProofKnownNonceCodec.encode(input.proof),
          extended_data:
            input.extendedData &&
            getCoreCodecsForContext(
              context
            ).hashedElGamalCiphertextCodec.encode(input.extendedData),
        }),
      };

    this.CiphertextSelectionCodec = C.make(
      CiphertextSelectionDecoder,
      CiphertextSelectionEncoder
    );

    const CiphertextContestDecoder: D.Decoder<unknown, CiphertextContest> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          description_hash: getCoreCodecsForContext(context).elementModQCodec,
          ballot_selections: D.array(CiphertextSelectionDecoder),
          ciphertext_accumulation:
            getCoreCodecsForContext(context).elGamalCiphertextCodec,
          crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
          nonce: getCoreCodecsForContext(context).elementModQCodec,
          proof:
            getCoreCodecsForContext(context)
              .constantChaumPedersenProofKnownNonceCodec,
        }),
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
              s.nonce
            )
        )
      );

    const CiphertextContestEncoder: E.Encoder<unknown, CiphertextContest> = {
      encode: input => ({
        object_id: input.contestId,
        sequence_order: input.sequenceOrder,
        description_hash: getCoreCodecsForContext(
          context
        ).elementModQCodec.encode(input.contestHash),
        ballot_selections: JSON.stringify(
          input.selections.map(CiphertextSelectionEncoder.encode)
        ),
        ciphertext_accumulation: getCoreCodecsForContext(
          context
        ).elGamalCiphertextCodec.encode(input.ciphertextAccumulation),
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.cryptoHash
        ),
        proof: getCoreCodecsForContext(
          context
        ).constantChaumPedersenProofKnownNonceCodec.encode(input.proof),
      }),
    };

    this.CiphertextContestCodec = C.make(
      CiphertextContestDecoder,
      CiphertextContestEncoder
    );

    const CiphertextBallotDecoder: D.Decoder<unknown, CiphertextBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        manifest_hash: getCoreCodecsForContext(context).elementModQCodec,
        code_hash: getCoreCodecsForContext(context).elementModQCodec,
        contests: D.array(CiphertextContestDecoder),
        code: getCoreCodecsForContext(context).elementModQCodec,
        timestamp: D.number,
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec,
        nonce: getCoreCodecsForContext(context).elementModQCodec,
        // state: D.number,
      }),
      D.map(
        s =>
          new CiphertextBallot(
            s.object_id,
            s.style_id,
            s.manifest_hash,
            s.code_hash,
            s.code,
            s.contests,
            s.timestamp,
            s.crypto_hash,
            s.nonce
          )
      )
    );

    const CiphertextBallotEncoder: E.Encoder<unknown, CiphertextBallot> = {
      encode: input => ({
        object_id: input.ballotId,
        style_id: input.ballotStyleId,
        manifest_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.manifestHash
        ),
        code_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.codeSeed
        ),
        contests: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.code
        ),
        code: JSON.stringify(
          input.contests.map(CiphertextContestEncoder.encode)
        ),
        timestamp: input.timestamp,
        crypto_hash: getCoreCodecsForContext(context).elementModQCodec.encode(
          input.cryptoHash
        ),
        // state: input.state,
      }),
    };

    this.CiphertextBallotCodec = C.make(
      CiphertextBallotDecoder,
      CiphertextBallotEncoder
    );

    const ExtendedDataDecoder: D.Decoder<unknown, ExtendedData> = pipe(
      D.struct({
        value: D.string,
        length: D.number,
      }),
      D.map(s => new ExtendedData(s.value, s.length))
    );

    const ExtendedDataEncoder: E.Encoder<unknown, ExtendedData> = {
      encode: input => ({
        value: input.value,
        length: input.length,
      }),
    };

    this.ExtendedDataCodec = C.make(ExtendedDataDecoder, ExtendedDataEncoder);

    const PlaintextSelectionDecoder: D.Decoder<unknown, PlaintextSelection> =
      pipe(
        D.struct({
          object_id: D.string,
          sequence_order: D.number,
          vote: D.number,
          is_placeholder_selection: D.boolean,
          extended_data: ExtendedDataDecoder,
        }),
        D.map(
          s =>
            new PlaintextSelection(
              s.object_id,
              s.sequence_order,
              s.vote,
              s.is_placeholder_selection,
              s.extended_data
            )
        )
      );

    const PlaintextSelectionEncoder: E.Encoder<unknown, PlaintextSelection> = {
      encode: input => ({
        object_id: input.selectionId,
        sequence_order: input.sequenceOrder,
        vote: input.vote,
        is_placeholder_selection: input.isPlaceholderSelection,
        extended_data: input.extendedData && ExtendedDataEncoder,
      }),
    };

    this.PlaintextSelectionCodec = C.make(
      PlaintextSelectionDecoder,
      PlaintextSelectionEncoder
    );

    const PlaintextContestDecoder: D.Decoder<unknown, PlaintextContest> = pipe(
      D.struct({
        object_id: D.string,
        sequence_order: D.number,
        ballot_selections: D.array(PlaintextSelectionDecoder),
      }),
      D.map(
        s =>
          new PlaintextContest(
            s.object_id,
            s.sequence_order,
            s.ballot_selections
          )
      )
    );

    const PlaintextContestEncoder: E.Encoder<unknown, PlaintextContest> = {
      encode: input => ({
        object_id: input.contestId,
        sequence_order: input.sequenceOrder,
        ballot_selections: JSON.stringify(
          input.selections.map(PlaintextSelectionEncoder.encode)
        ),
      }),
    };

    this.PlaintextContestCodec = C.make(
      PlaintextContestDecoder,
      PlaintextContestEncoder
    );

    const PlaintextBallotDecoder: D.Decoder<unknown, PlaintextBallot> = pipe(
      D.struct({
        object_id: D.string,
        style_id: D.string,
        contests: D.array(PlaintextContestDecoder),
      }),
      D.map(s => new PlaintextBallot(s.object_id, s.style_id, s.contests))
    );

    const PlaintextBallotEncoder: E.Encoder<unknown, PlaintextBallot> = {
      encode: input => ({
        object_id: input.ballotId,
        style_id: input.ballotStyleId,
        contests: input.contests.map(PlaintextContestEncoder.encode),
      }),
    };

    this.PlaintextBallotCodec = C.make(
      PlaintextBallotDecoder,
      PlaintextBallotEncoder
    );
  }
}

const codecs = new Map<string, Codecs>();

export function getCodecsForContext(context: GroupContext): Codecs {
  let result = codecs.get(context.name);
  if (result === undefined) {
    result = new Codecs(context);
    codecs.set(context.name, new Codecs(context));
  }
  return result;
}
