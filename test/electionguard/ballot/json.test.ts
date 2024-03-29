import {
  GroupContext,
  bigIntContext3072,
  getCoreCodecsForContext,
  getBallotCodecsForContext,
} from '../../../src/electionguard';
import {testCodecLaws} from '../core/testCodecLaws';
import * as G from './generators';

function testBallotCodecsForContext(context: GroupContext) {
  const cCodecs = getCoreCodecsForContext(context);
  const bCodecs = getBallotCodecsForContext(context);
  testCodecLaws(
    context.name,
    'ManifestLanguage',
    G.language(context),
    bCodecs.manifestLanguageCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ManifestLanguage.human',
    G.languageHumanName(context),
    bCodecs.manifestLanguageCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ManifestAnnotatedString',
    G.emailAnnotatedString(context),
    bCodecs.manifestAnnotatedStringCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'InternationalizedTest',
    G.internationalizedText(context),
    bCodecs.manifestInternationalizedTextCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'InternationalizedTest.human',
    G.internationalizedHumanName(context),
    bCodecs.manifestInternationalizedTextCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'AnnotatedString',
    G.annotatedString(context),
    bCodecs.manifestAnnotatedStringCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElectionType',
    G.electionType(),
    bCodecs.manifestElectionTypeCodec,
    (a, b) => a === b
  );
  testCodecLaws(
    context.name,
    'ReportingUnitType',
    G.reportingUnitType(),
    bCodecs.manifestReportingUnitTypeCodec,
    (a, b) => a === b
  );
  testCodecLaws(
    context.name,
    'ElectionVariationType',
    G.voteVariationType(),
    bCodecs.manifestVoteVariationTypeCodec,
    (a, b) => a === b
  );
  testCodecLaws(
    context.name,
    'GeopoliticalUnit',
    G.geopoliticalUnit(context),
    bCodecs.manifestGeopoliticalUnitCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ContactInformation',
    G.contactInformation(context),
    bCodecs.manifestContactInformationCodec,
    (a, b) => a.equals(b)
  );

  /* -- useful for trying to narrow things down if we're
     -- failing to encode/decode an entire Manifest
  testCodecLaws(
    context.name,
    'BallotStyle',
    G.electionDescription(context).map(m => m.ballotStyles[0]),
    bCodecs.manifestBallotStyleCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'Candidates',
    G.electionDescription(context).map(m => m.candidates[0]),
    bCodecs.manifestCandidateCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'Contests',
    G.electionDescription(context).map(m => m.contests[0]),
    bCodecs.manifestContestDescriptionCodec,
    (a, b) => a.equals(b)
  );
  */
  testCodecLaws(
    context.name,
    'Manifest',
    G.electionDescription(context),
    bCodecs.manifestCodec,
    (a, b) => a.equals(b)
  );
  testCodecLaws(
    context.name,
    'ElectionContext',
    G.electionAndBallots(context, 1).map(eb => eb.electionContext),
    cCodecs.electionContextCodec,
    (a, b) =>
      a.equals(b) &&
      a.jointPublicKey.element.isValidResidue() &&
      b.jointPublicKey.element.isValidResidue()
  );
  testCodecLaws(
    context.name,
    'EncryptionState',
    G.encryptionState(context),
    bCodecs.encryptionStateCodec,
    (a, b) => a.equals(b)
  );
}

testBallotCodecsForContext(bigIntContext3072());
