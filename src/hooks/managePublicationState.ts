import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook } from 'payload'

import { deepMerge } from '../lib/deepMerge'
import type { ReleaseWorkflowState } from '../access/workflowTransitions'

const relId = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)
    ? (value as Record<string, unknown>).id
    : value

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
export const manageReleaseServerFields: CollectionBeforeChangeHook = async ({ data, originalDoc, operation }) => {
  if (!data) return data

  const nextWorkflowState =
    (data.workflowState as ReleaseWorkflowState | undefined) ??
    (originalDoc?.workflowState as ReleaseWorkflowState | undefined) ??
    'draft'

  // --- 1. Derive status/publicVisibility from workflowState alone ---
  data.status = nextWorkflowState === 'published' ? 'published' : 'draft'

  const originalDistribution = (originalDoc?.distribution as Record<string, unknown> | undefined) ?? {}
  const incomingDistribution = (data.distribution as Record<string, unknown> | undefined) ?? {}
  const mergedDistribution = deepMerge(originalDistribution, incomingDistribution)

  const derivedVisibility =
    nextWorkflowState === 'published' ? 'public' : nextWorkflowState === 'archived' ? 'archived' : 'preview'

  data.distribution = { ...mergedDistribution, publicVisibility: derivedVisibility }

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

const clearParentReleaseAttestation = async (
  releaseRef: unknown,
  payload: import('payload').Payload,
  req: import('payload').PayloadRequest,
): Promise<void> => {
  const releaseId = relId(releaseRef)
  if (releaseId === undefined || releaseId === null) return

  await payload
    .update({
      collection: 'releases',
      id: releaseId as string | number,
      data: { previewAttestation: { ...EMPTY_ATTESTATION } },
      req,
      context: { skipPublicationStateManagement: true },
      depth: 0,
    })
    .catch(() => {
      // Best-effort: if the parent release was deleted concurrently, or the
      // update races a delete, there is nothing left to invalidate.
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
