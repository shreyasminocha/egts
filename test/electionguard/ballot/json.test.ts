import {GroupContext} from '../../../src/electionguard/core/group-common';
import {bigIntContext3072} from '../../../src/electionguard/core/group-bigint';
import {getBallotCodecsForContext} from '../../../src/electionguard/ballot/json';
import {testCodecLaws} from '../core/testCodecLaws';
import * as G from './generators';
import * as M from '../../../src/electionguard/ballot/manifest';

function testBallotCodecsForContext(context: GroupContext) {
  //   const cCodecs = getCoreCodecsForContext(context);
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
    // equality on enums is weird
    (a, b) => M.ManifestElectionType[a] === M.ManifestElectionType[b]
  );
}

testBallotCodecsForContext(bigIntContext3072());
