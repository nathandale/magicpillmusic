import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
} from 'payload'

import { deepMerge } from '../lib/deepMerge'
import type { ReleaseWorkflowState } from '../access/workflowTransitions'

const relId = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)
    ? (value as Record<string, unknown>).id
    : value

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  if ('id' in record && (typeof record.id === 'string' || typeof record.id === 'number')) return record.id

  return Object.fromEntries(
    Object.entries(record)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalize(child)]),
  )
}

const releasePublicationSnapshot = (release: Record<string, unknown>): string => {
  const copy = structuredClone(release)
  for (const key of [
    'id',
    'createdAt',
    'updatedAt',
    '_status',
    'status',
    'workflowState',
    'releaseGuid',
    'previewAttestation',
    'analyticsVerification',
  ]) {
    delete copy[key]
  }

  const myradio = copy.myradio as Record<string, unknown> | undefined
  if (myradio) delete myradio.themeRevision
  const distribution = copy.distribution as Record<string, unknown> | undefined
  if (distribution) delete distribution.publicVisibility

  return JSON.stringify(canonicalize(copy))
}

type MyRadioGroup = {
  theme?: string | null
  themeRevision?: number | null
  themeTokens?: Record<string, unknown> | null
  themeAssets?: { backgroundImage?: unknown; textureImage?: unknown; markImage?: unknown } | null
  themeOptions?: Record<string, unknown> | null
  signalCard?: Record<string, unknown> | null
  socialCard?: Record<string, unknown> | null
} & Record<string, unknown>

const EMPTY_ATTESTATION = {
  attestedAt: null,
  attestedBy: null,
  themeRevisionAt: null,
  trackFingerprintAt: null,
  playerVersionAt: null,
  schemaVersionAt: null,
}

const EMPTY_ANALYTICS_VERIFICATION = {
  latest: null,
  summary: {
    verifiedAt: null,
    verifiedBy: null,
    environment: null,
    schemaVersion: null,
    playerVersion: null,
    themeVersion: null,
    sampleEventIds: [],
  },
}

/** Identity snapshot of everything that makes a Signal Card visually "this release" — used to decide whether `themeRevision` must bump. */
const themeIdentitySnapshot = (m: MyRadioGroup | null | undefined): string =>
  JSON.stringify({
    theme: m?.theme ?? null,
    tokens: m?.themeTokens ?? {},
    assets: {
      backgroundImage: relId(m?.themeAssets?.backgroundImage) ?? null,
      textureImage: relId(m?.themeAssets?.textureImage) ?? null,
      markImage: relId(m?.themeAssets?.markImage) ?? null,
    },
    options: m?.themeOptions ?? {},
    signalCard: m?.signalCard ?? {},
    socialCard: m?.socialCard ?? {},
  })

/**
 * Runs before the publish-validation hook (src/hooks/validatePublishTransition.ts)
 * on every Release save. Two responsibilities, both about making state that used to
 * be independently client-editable fully derived/managed instead:
 *
 * 1. `status` (legacy) and `distribution.publicVisibility` are computed from
 *    `workflowState` alone, unconditionally overwriting whatever the client sent
 *    (both fields also carry `access.create`/`update: () => false`, so a direct API
 *    write is rejected before this hook even runs — this is what actually computes
 *    the value, belt and suspenders). `publicVisibility` used to be an independent
 *    field an authenticated user could set to `'public'` without ever touching
 *    `workflowState` — a real publish-gate bypass this closes.
 *
 * 2. `myradio.themeRevision` auto-increments whenever the theme-identity fields
 *    (`theme`, `themeTokens`, `themeAssets`, `themeOptions`, `signalCard`,
 *    `socialCard`) actually change, and `previewAttestation` is eagerly cleared
 *    the same moment — not just detected-as-stale later, at transition time. Track-
 *    side invalidation (audio/duration/order changes) is handled separately by the
 *    Tracks hooks below, which reach into the parent Release.
 */
export const manageReleaseServerFields: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, context }) => {
  if (!data) return data

  const nextWorkflowState =
    (data.workflowState as ReleaseWorkflowState | undefined) ??
    (originalDoc?.workflowState as ReleaseWorkflowState | undefined) ??
    'draft'

  // A passing gate applies to one exact public document. Once a release is public,
  // accepting content/configuration edits while leaving workflowState="published"
  // would expose unpreviewed and unverified bytes without another transition through
  // the gate. Require an explicit move back to an editable state first. Trusted
  // server-only bookkeeping (receipt pointer/summary writes) is excluded and cannot
  // alter public presentation or media fields.
  if (
    operation === 'update' &&
    originalDoc?.workflowState === 'published' &&
    nextWorkflowState === 'published' &&
    context?.skipPublicationStateManagement !== true
  ) {
    const merged = deepMerge(
      originalDoc as Record<string, unknown>,
      data as Record<string, unknown>,
    )
    if (releasePublicationSnapshot(originalDoc as Record<string, unknown>) !== releasePublicationSnapshot(merged)) {
      throw new Error(
        'This release is published. Move workflowState out of "published" before editing release content, distribution, analytics schema, or presentation fields; then re-run preview and analytics verification before publishing again.',
      )
    }
  }

  // --- 1. Derive status/publicVisibility from workflowState alone ---
  data.status = nextWorkflowState === 'published' ? 'published' : 'draft'

  const originalDistribution = (originalDoc?.distribution as Record<string, unknown> | undefined) ?? {}
  const incomingDistribution = (data.distribution as Record<string, unknown> | undefined) ?? {}
  const mergedDistribution = deepMerge(originalDistribution, incomingDistribution)

  const derivedVisibility =
    nextWorkflowState === 'published' ? 'public' : nextWorkflowState === 'archived' ? 'archived' : 'preview'

  data.distribution = { ...mergedDistribution, publicVisibility: derivedVisibility }

  const analyticsSchemaChanged =
    operation === 'update' &&
    incomingDistribution.analyticsSchemaVersion !== undefined &&
    incomingDistribution.analyticsSchemaVersion !== originalDistribution.analyticsSchemaVersion

  if (analyticsSchemaChanged) {
    data.previewAttestation = { ...EMPTY_ATTESTATION }
    data.analyticsVerification = structuredClone(EMPTY_ANALYTICS_VERIFICATION)
  }

  // --- 2. themeRevision + previewAttestation invalidation ---
  const originalMyradio = (originalDoc?.myradio as MyRadioGroup | null) ?? null
  const incomingMyradio = data.myradio as MyRadioGroup | undefined

  if (incomingMyradio !== undefined) {
    const mergedMyradio = deepMerge((originalMyradio ?? {}) as Record<string, unknown>, incomingMyradio) as MyRadioGroup

    const themeChanged =
      operation === 'update' && themeIdentitySnapshot(originalMyradio) !== themeIdentitySnapshot(mergedMyradio)

    if (themeChanged) {
      const nextRevision = ((originalMyradio?.themeRevision as number | undefined) ?? 0) + 1
      data.myradio = { ...mergedMyradio, themeRevision: nextRevision }
      data.previewAttestation = { ...EMPTY_ATTESTATION }
      data.analyticsVerification = structuredClone(EMPTY_ANALYTICS_VERIFICATION)
    } else {
      // themeRevision itself is server-controlled (its own field access already
      // blocks a direct client write) — this just makes sure the merged group we
      // write back never regresses it to something a partial-group request omitted.
      data.myradio = { ...mergedMyradio, themeRevision: originalMyradio?.themeRevision ?? 0 }
    }
  }

  return data
}

// ---------------------------------------------------------------------------
// Cross-collection invalidation: a Track's own audio/order/identity changing
// invalidates its parent Release's preview attestation too, since the attestation
// depends on the track-set fingerprint (src/lib/trackFingerprint.ts), which this
// collection's hooks can't see from the Release side.
// ---------------------------------------------------------------------------

type TrackPreviewFields = {
  shareId?: string | null
  trackNumber?: number | null
  duration?: number | null
  mimeType?: string | null
  fileSize?: number | null
  audioUrl?: string | null
  audioFile?: unknown
}

const trackPreviewSnapshot = (t: TrackPreviewFields | null | undefined): string =>
  JSON.stringify({
    shareId: t?.shareId ?? null,
    trackNumber: t?.trackNumber ?? null,
    duration: t?.duration ?? null,
    mimeType: t?.mimeType ?? null,
    fileSize: t?.fileSize ?? null,
    audioUrl: t?.audioUrl ?? null,
    audioFile: relId(t?.audioFile) ?? null,
  })

const trackMutationSnapshot = (track: Record<string, unknown>): string => {
  const copy = structuredClone(track)
  for (const key of ['id', 'createdAt', 'updatedAt', 'guid', 'shareId', 'rightsConfirmedAt', 'rightsConfirmedBy']) {
    delete copy[key]
  }
  return JSON.stringify(canonicalize(copy))
}

const parentReleaseIsPublished = async (
  releaseRef: unknown,
  req: import('payload').PayloadRequest,
): Promise<boolean> => {
  const releaseId = relId(releaseRef)
  if (releaseId === undefined || releaseId === null) return false
  const release = await req.payload.findByID({
    collection: 'releases',
    id: releaseId as string | number,
    depth: 0,
    req,
  })
  return release.workflowState === 'published'
}

/** A public release must be moved back to an editable workflow state before any child Track is created or changed. */
export const protectPublishedReleaseTrackMutation: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  if (context?.skipPublicationStateManagement) return data

  const releaseRef = data?.release ?? originalDoc?.release
  if (!(await parentReleaseIsPublished(releaseRef, req))) return data

  const changed =
    operation === 'create' ||
    trackMutationSnapshot((originalDoc ?? {}) as Record<string, unknown>) !==
      trackMutationSnapshot(
        deepMerge(
          (originalDoc ?? {}) as Record<string, unknown>,
          (data ?? {}) as Record<string, unknown>,
        ),
      )

  if (changed) {
    throw new Error(
      'The parent release is published. Move the release workflowState out of "published" before creating or editing tracks; the release must be previewed and verified again before republishing.',
    )
  }
  return data
}

export const protectPublishedReleaseTrackDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const track = await req.payload.findByID({ collection: 'tracks', id, depth: 0, req })
  if (await parentReleaseIsPublished(track.release, req)) {
    throw new Error(
      'The parent release is published. Move the release workflowState out of "published" before deleting tracks.',
    )
  }
}

const clearParentReleaseAttestation = async (
  releaseRef: unknown,
  payload: import('payload').Payload,
  req: import('payload').PayloadRequest,
): Promise<void> => {
  const releaseId = relId(releaseRef)
  if (releaseId === undefined || releaseId === null) return

  // This is deliberately fail-closed. A permissions, transaction, or database
  // failure must abort the originating Track mutation rather than leave a stale
  // attestation attached. Deleting a Track whose parent was concurrently removed is
  // also safe to fail/retry; silently guessing "not found" here is not.
  await payload.update({
    collection: 'releases',
    id: releaseId as string | number,
    data: {
      previewAttestation: { ...EMPTY_ATTESTATION },
      analyticsVerification: structuredClone(EMPTY_ANALYTICS_VERIFICATION),
    },
    req,
    context: { skipPublicationStateManagement: true },
    depth: 0,
  })
}

export const invalidateReleasePreviewOnTrackChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (context?.skipPublicationStateManagement) return doc

  const changed =
    operation === 'create' ||
    trackPreviewSnapshot(previousDoc as TrackPreviewFields) !== trackPreviewSnapshot(doc as TrackPreviewFields)

  if (changed) {
    await clearParentReleaseAttestation(doc.release, req.payload, req)
  }

  return doc
}

export const invalidateReleasePreviewOnTrackDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await clearParentReleaseAttestation(doc?.release, req.payload, req)
}
