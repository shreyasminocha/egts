import fc from 'fast-check';
import {GroupContext} from '../../../src/electionguard';
import * as Manifest from '../../../src/electionguard/ballot/manifest';

export function manifestLanguage(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestLanguage> {
  return fc
    .tuple(fc.string(), fc.string({minLength: 2, maxLength: 3}))
    .map(([val, lang]) => new Manifest.ManifestLanguage(context, val, lang));
}

export function manifestInternationalizedText(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestInternationalizedText> {
  return fc
    .array(manifestLanguage(context))
    .map(arr => new Manifest.ManifestInternationalizedText(context, arr));
}

export function manifestSelectionDescription(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestSelectionDescription> {
  return fc
    .tuple(fc.uuid(), fc.nat(), fc.uuid())
    .map(
      ([id, sequenceNumber, candidateId]) =>
        new Manifest.ManifestSelectionDescription(
          context,
          id,
          sequenceNumber,
          candidateId
        )
    );
}

export function manifestAnnotatedString(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestAnnotatedString> {
  return fc
    .tuple(fc.string(), fc.string())
    .map(
      ([annotation, value]) =>
        new Manifest.ManifestAnnotatedString(context, annotation, value)
    );
}

export function manifestContactInformation(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestContactInformation> {
  return fc
    .tuple(
      fc.array(fc.string()),
      fc.array(manifestAnnotatedString(context)),
      fc.array(manifestAnnotatedString(context)),
      fc.string()
    )
    .map(t => {
      const [address, email, phone, name] = t;
      return new Manifest.ManifestContactInformation(
        context,
        address,
        email,
        phone,
        name
      );
    });
}

export function manifestGeopoliticalUnit(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestGeopoliticalUnit> {
  return fc
    .tuple(
      fc.uuid(),
      fc.string(),
      fc.constantFrom(...Object.values(Manifest.ManifestReportingUnitType)),
      manifestContactInformation(context)
    )
    .map(t => {
      const [id, name, type, contactInformation] = t;
      return new Manifest.ManifestGeopoliticalUnit(
        context,
        id,
        name,
        type as Manifest.ManifestReportingUnitType,
        contactInformation
      );
    });
}

export function manifestCandidate(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestCandidate> {
  return fc
    .tuple(
      fc.uuid(),
      manifestInternationalizedText(context),
      fc.uuid(),
      fc.webUrl(),
      fc.boolean()
    )
    .map(t => {
      const [id, name, party, imageUri, isWriteIn] = t;
      return new Manifest.ManifestCandidate(
        context,
        id,
        name,
        party,
        imageUri,
        isWriteIn
      );
    });
}

export function manifestParty(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestParty> {
  return fc
    .tuple(
      fc.uuid(),
      manifestInternationalizedText(context),
      fc.string(),
      fc.string(),
      fc.webUrl()
    )
    .map(t => {
      const [id, name, abbreviation, color, logoUri] = t;
      return new Manifest.ManifestParty(
        context,
        id,
        name,
        abbreviation,
        color,
        logoUri
      );
    });
}

export function manifestBallotStyle(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestBallotStyle> {
  return fc
    .tuple(fc.uuid(), fc.array(fc.string()), fc.array(fc.uuid()), fc.webUrl())
    .map(t => {
      const [id, gpuIds, partyIds, imageUri] = t;
      return new Manifest.ManifestBallotStyle(
        context,
        id,
        gpuIds,
        partyIds,
        imageUri
      );
    });
}

export function manifestContestDescription(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestContestDescription> {
  return fc
    .tuple(
      fc.uuid(),
      fc.nat(),
      fc.uuid(),
      fc.nat(),
      fc.nat(),
      fc.nat(),
      fc.string(),
      // TOFIX: Need to ensure that the sequence numbers are unique.
      fc.array(manifestSelectionDescription(context)),
      fc.option(manifestInternationalizedText(context), {nil: undefined}),
      fc.option(manifestInternationalizedText(context), {nil: undefined})
    )
    .map(t => new Manifest.ManifestContestDescription(context, ...t));
}

export const manifestReferendumContestDescription = manifestContestDescription;

export function manifestCandidateContestDescription(
  context: GroupContext
): fc.Arbitrary<Manifest.ManifestCandidateContestDescription> {
  return fc
    .tuple(
      fc.uuid(),
      fc.nat(),
      fc.uuid(),
      fc.nat(),
      fc.nat(),
      fc.nat(),
      fc.string(),
      // TOFIX: Need to ensure that the sequence numbers are unique.
      fc.array(manifestSelectionDescription(context)),
      fc.option(manifestInternationalizedText(context), {nil: undefined}),
      fc.option(manifestInternationalizedText(context), {nil: undefined}),
      fc.option(fc.array(fc.uuid()), {nil: undefined})
    )
    .map(t => new Manifest.ManifestCandidateContestDescription(context, ...t));
}

export function manifest(
  context: GroupContext
): fc.Arbitrary<Manifest.Manifest> {
  return fc
    .tuple(
      fc.uuid(),
      fc.string(),
      fc.nat(),
      fc.date(),
      fc.date(),
      fc.array(manifestGeopoliticalUnit(context)),
      fc.array(manifestParty(context)),
      fc.array(manifestCandidate(context)),
      fc.array(manifestContestDescription(context)),
      fc.array(manifestBallotStyle(context)),
      manifestInternationalizedText(context),
      manifestContactInformation(context)
    )
    .map(t => {
      const [id, specVersion, type, startDate, endDate, ...rest] = t;
      return new Manifest.Manifest(
        context,
        id,
        specVersion,
        type,
        startDate.toISOString(),
        endDate.toISOString(),
        ...rest
      );
    });
}
