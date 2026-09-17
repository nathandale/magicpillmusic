import type { CollectionBeforeChangeHook, Payload } from 'payload'

import { collectValidReleaseThemeTokens } from '../lib/release-theme'
import { FINAL_PUBLICATION_STATES, type ReleaseWorkflowState } from '../access/workflowTransitions'

/**
 * EO §7.6 publish-validation gate, scoped to Workstream 1A.
 *
 * The EO's own wording is precise: the gate blocks movement into `analytics_verified`,
 * `scheduled`, or `published` specifically — not into the earlier controlled states
 * (`media_ready`, `player_previewed`, `shadow_ready`), which are reached through the
 * "Run player preview" / editorial-checklist workflow rather than this hook. This
 * function therefore only runs its checks when `workflowState` is actually changing
 * *into* one of those three final-tier states. Ordinary draft editing — saving any
 * other field, or saving without touching `workflowState` at all — returns
 * immediately and is never slowed down or blocked by this hook.
 *
 * Two of the EO's eighteen conditions (PostHog receipt, preview attestation) depend
 * on external services that do not exist yet (Workstream 1B: MYRADIO preview routes,
 * the PostHog analytics gate). Per Nathan's 2026-09-17 authorization, those conditions
 * must fail closed with a clear, actionable message — never be skipped, faked, or
 * silently passed — until the real services exist and a genuine attestation/receipt
 * has been recorded.
 */

const ERRORS: string[] = []

const fail = (message: string): void => {
  ERRORS.push(message)
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isWellFormedUrl = (value: unknown): boolean => {
  if (!isNonEmptyString(value)) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

// --- WCAG 2.x relative-luminance / contrast-ratio math (pure, no external calls) ---
// https://www.w3.org/TR/WCAG21/#contrast-minimum — used here to check the theme
// token pairs DEMU actually has both sides of. Preset-inherited colors aren't
// DEMU's to validate (the presets live in MYRADIO's CSS, per the audit) — this only
// checks pairs where the release has explicitly overridden *both* tokens.
const hexToRgb = (hex: string): [number, number, number] | null => {
  const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(hex.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const channel = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrastRatio = (hexA: string, hexB: string): number | null => {
  const rgbA = hexToRgb(hexA)
  const rgbB = hexToRgb(hexB)
  if (!rgbA || !rgbB) return null
  const lumA = relativeLuminance(rgbA)
  const lumB = relativeLuminance(rgbB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

type ThemeTokens = Record<string, string | null | undefined>

const CONTRAST_PAIRS: { fg: string; bg: string; minRatio: number; label: string }[] = [
  { fg: 'panelText', bg: 'panelStart', minRatio: 4.5, label: 'panel text vs. panel background' },
  { fg: 'panelMuted', bg: 'panelStart', minRatio: 4.5, label: 'muted panel text vs. panel background' },
  { fg: 'actionText', bg: 'actionBackground', minRatio: 4.5, label: 'action button text vs. action background' },
  { fg: 'popoverText', bg: 'popoverBackground', minRatio: 4.5, label: 'popover text vs. popover background' },
  { fg: 'popoverMuted', bg: 'popoverBackground', minRatio: 4.5, label: 'muted popover text vs. popover background' },
  { fg: 'beacon', bg: 'panelStart', minRatio: 3, label: 'beacon/focus indicator vs. panel background (non-text, 3:1)' },
]

const checkThemeContrast = (tokens: ThemeTokens): void => {
  for (const { fg, bg, minRatio, label } of CONTRAST_PAIRS) {
    const fgValue = tokens[fg]
    const bgValue = tokens[bg]
    if (!fgValue || !bgValue) continue // only check pairs the release has actually overridden on both sides
    const ratio = contrastRatio(fgValue, bgValue)
    if (ratio === null) continue // malformed values are already caught by collectValidReleaseThemeTokens
    if (ratio < minRatio) {
      fail(`Theme contrast: ${label} is ${ratio.toFixed(2)}:1, below the required ${minRatio}:1.`)
    }
  }
}

type ReleaseLike = {
  id?: number | string
  releaseGuid?: string | null
  artist?: unknown
  releaseDate?: string | null
  coverImage?: unknown
  myradio?: {
    theme?: string | null
    isDefault?: boolean | null
    themeSchemaVersion?: number | null
    themeTokens?: ThemeTokens | null
  } | null
  distribution?: {
    releaseLane?: string | null
    embedEnabled?: boolean | null
    shadowPostUrl?: string | null
    shadowPostSlug?: string | null
    campaignKey?: string | null
    analyticsSchemaVersion?: number | null
  } | null
  previewAttestation?: {
    attestedAt?: string | null
    themeRevisionAt?: number | null
    trackFingerprintAt?: string | null
    playerVersionAt?: string | null
    schemaVersionAt?: number | null
  } | null
  analyticsVerification?: {
    latest?: unknown
  } | null
}

const trackSetFingerprint = (
  tracks: { shareId?: string | null; duration?: number | null; guid?: string | null }[],
): string =>
  tracks
    .map((t) => `${t.shareId ?? t.guid ?? ''}:${t.duration ?? 0}`)
    .sort()
    .join('|')

const validateReleaseFinalTransition = async (
  payload: Payload,
  release: ReleaseLike,
): Promise<void> => {
  // 1. Stable GUIDs
  if (!isNonEmptyString(release.releaseGuid)) {
    fail('Release GUID is missing.')
  }

  // 3. Artist
  if (!release.artist) {
    fail('Artist is required.')
  }

  // 4. Release date or intentional archive treatment
  const lane = release.distribution?.releaseLane
  if (!release.releaseDate && lane !== 'archive') {
    fail('Release date is required unless the release lane is "archive".')
  }

  // 5. Approved cover art + alt text
  if (!release.coverImage) {
    fail('Cover image is required.')
  } else {
    const coverId = typeof release.coverImage === 'object' ? (release.coverImage as { id?: unknown }).id : release.coverImage
    if (coverId !== undefined && coverId !== null) {
      const media = await payload.findByID({ collection: 'media', id: coverId as string | number, depth: 0 }).catch(() => null)
      if (!media || !isNonEmptyString((media as { alt?: unknown }).alt)) {
        fail('Cover image is missing alt text.')
      }
    }
  }

  // 8/9. Tracks: at least one, deterministic order, no duplicate track numbers
  const tracksResult = release.id
    ? await payload.find({
        collection: 'tracks',
        where: { release: { equals: release.id } },
        depth: 0,
        limit: 500,
      })
    : { docs: [] }
  const tracks = tracksResult.docs as {
    id: number | string
    shareId?: string | null
    guid?: string | null
    trackNumber?: number | null
    mimeType?: string | null
    fileSize?: number | null
    duration?: number | null
    audioFile?: unknown
    audioUrl?: string | null
    explicit?: boolean | null
    rightsConfirmed?: boolean | null
    lyricsStatus?: string | null
  }[]

  if (tracks.length === 0) {
    fail('At least one track is required.')
  }

  const trackNumbers = tracks.map((t) => t.trackNumber).filter((n): n is number => typeof n === 'number')
  if (new Set(trackNumbers).size !== trackNumbers.length) {
    fail('Duplicate track numbers found — track order must be deterministic.')
  }

  for (const track of tracks) {
    const label = `Track "${track.id}"`

    // 1 (track half): shareId present
    if (!isNonEmptyString(track.shareId)) {
      fail(`${label}: missing shareId.`)
    }

    // 6/7: audio present and well-formed; MIME/size/duration plausible
    const hasAudioFile = Boolean(track.audioFile)
    const hasAudioUrl = isNonEmptyString(track.audioUrl)
    if (!hasAudioFile && !hasAudioUrl) {
      fail(`${label}: no audio file or audio URL.`)
    }
    if (hasAudioUrl && !isWellFormedUrl(track.audioUrl)) {
      fail(`${label}: audio URL is not well-formed.`)
    }
    // Presence/well-formedness only — a live server-side HEAD/range probe of the
    // audio origin is deferred; see the Workstream 1A completion report.
    if (!isNonEmptyString(track.mimeType)) {
      fail(`${label}: MIME type is missing.`)
    }
    if (typeof track.duration !== 'number' || track.duration <= 0) {
      fail(`${label}: duration is missing or implausible.`)
    }

    // 10. Explicit-content value set (always has a schema default; kept for
    // documentation/parity with the EO's condition list)
    if (typeof track.explicit !== 'boolean') {
      fail(`${label}: explicit-content flag is not set.`)
    }

    // 11. Rights confirmation
    if (!track.rightsConfirmed) {
      fail(`${label}: rights are not confirmed.`)
    }

    // 12. Lyrics verified or explicitly not applicable
    if (track.lyricsStatus !== 'verified' && track.lyricsStatus !== 'not_applicable') {
      fail(`${label}: lyrics status must be "verified" or "not applicable" (currently "${track.lyricsStatus ?? 'missing'}").`)
    }
  }

  // 13. MYRADIO theme/order valid; no more than one default release
  if (!isNonEmptyString(release.myradio?.theme)) {
    fail('MYRADIO theme is required.')
  }
  if (release.myradio?.isDefault && release.id) {
    const others = await payload.find({
      collection: 'releases',
      where: {
        and: [{ 'myradio.isDefault': { equals: true } }, { id: { not_equals: release.id } }],
      },
      depth: 0,
      limit: 1,
    })
    if (others.totalDocs > 0) {
      fail('Another release is already marked as the default MYRADIO channel — only one is allowed.')
    }
  }

  // 14. Theme schema/revision present, tokens valid, contrast checks
  if (!release.myradio?.themeSchemaVersion) {
    fail('Theme schema version is missing.')
  }
  const { invalidKeys } = collectValidReleaseThemeTokens(release.myradio?.themeTokens ?? {})
  if (invalidKeys.length > 0) {
    fail(`Invalid theme token value(s): ${invalidKeys.join(', ')}.`)
  }
  checkThemeContrast((release.myradio?.themeTokens as ThemeTokens) ?? {})

  // 16. Embed enabled
  if (!release.distribution?.embedEnabled) {
    fail('Embed is not enabled for this release (Distribution → "Embed enabled").')
  }

  // 17. Canonical SHADOW URL/slug
  if (!isWellFormedUrl(release.distribution?.shadowPostUrl)) {
    fail('SHADOW post URL is missing or not well-formed.')
  }
  if (!isNonEmptyString(release.distribution?.shadowPostSlug)) {
    fail('SHADOW post slug is missing.')
  }

  // 18. Campaign key + analytics schema version
  if (!isNonEmptyString(release.distribution?.campaignKey)) {
    fail('Campaign key is missing.')
  }
  if (!release.distribution?.analyticsSchemaVersion) {
    fail('Analytics schema version is missing.')
  }

  // 19. PostHog verification receipt — fails closed; Workstream 1B not authorized.
  const receiptPointer = release.analyticsVerification?.latest
  if (!receiptPointer) {
    fail(
      'No passing PostHog verification receipt is recorded for this release. This requires the "Verify analytics" action, which is not available until Workstream 1B (the MYRADIO analytics gate) ships. This is expected, not a bug — publication cannot proceed until a real verification has run.',
    )
  } else {
    const receiptId = typeof receiptPointer === 'object' ? (receiptPointer as { id?: unknown }).id : receiptPointer
    const receipt = receiptId
      ? await payload.findByID({ collection: 'analytics-verification-receipts', id: receiptId as string | number, depth: 0 }).catch(() => null)
      : null
    if (!receipt || (receipt as { outcome?: string }).outcome !== 'pass') {
      fail('The referenced analytics verification receipt is missing or is not a passing attempt.')
    } else if ((receipt as { schemaVersion?: number }).schemaVersion !== release.distribution?.analyticsSchemaVersion) {
      fail('The recorded analytics verification receipt is for a different analytics schema version than this release currently declares — re-verify.')
    }
  }

  // 20. Preview attestation — fails closed; Workstream 1B not authorized.
  const attestation = release.previewAttestation
  if (!isNonEmptyString(attestation?.attestedAt)) {
    fail(
      'No preview attestation is recorded for this release. This requires the "Run player preview" action, which is not available until Workstream 1B (real MYRADIO preview routes) ships. This is expected, not a bug — publication cannot proceed until a real preview has been run.',
    )
  } else {
    const currentFingerprint = trackSetFingerprint(tracks)
    const staleReasons: string[] = []
    if (attestation?.themeRevisionAt !== (release.myradio as { themeRevision?: number } | null)?.themeRevision) {
      staleReasons.push('theme has changed since the preview was run')
    }
    if (attestation?.trackFingerprintAt !== currentFingerprint) {
      staleReasons.push('the track list or a track’s audio has changed since the preview was run')
    }
    if (attestation?.schemaVersionAt !== release.distribution?.analyticsSchemaVersion) {
      staleReasons.push('the analytics schema version has changed since the preview was run')
    }
    if (staleReasons.length > 0) {
      fail(`Preview attestation is stale (${staleReasons.join('; ')}) — re-run "Run player preview".`)
    }
  }
}

export const validateReleasePublishTransition: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const nextState = data?.workflowState as ReleaseWorkflowState | undefined
  const currentState = (originalDoc?.workflowState as ReleaseWorkflowState | undefined) ?? 'draft'

  // Campaign key immutability (decision-adjacent rule): once a release has ever
  // reached a final-publication state, its campaign key cannot change — checked on
  // every update regardless of what's being transitioned this time, since the EO
  // requires it "immutable after campaign launch," not just at the moment of launch.
  if (
    operation === 'update' &&
    FINAL_PUBLICATION_STATES.has(currentState) &&
    data?.distribution?.campaignKey !== undefined &&
    originalDoc?.distribution?.campaignKey !== undefined &&
    data.distribution.campaignKey !== originalDoc.distribution.campaignKey
  ) {
    throw new Error('Campaign key cannot change once a release has reached "scheduled" or "published".')
  }

  // Only the three EO-specified final-tier states are gated by this hook, and only
  // when actually transitioning into one of them. Ordinary draft editing is
  // untouched.
  if (!nextState || nextState === currentState || !FINAL_PUBLICATION_STATES.has(nextState) && nextState !== 'analytics_verified') {
    return data
  }

  ERRORS.length = 0
  const merged: ReleaseLike = { ...(originalDoc as ReleaseLike), ...(data as ReleaseLike), id: originalDoc?.id ?? data?.id }
  await validateReleaseFinalTransition(req.payload, merged)

  if (ERRORS.length > 0) {
    throw new Error(`Cannot move to "${nextState}":\n- ${ERRORS.join('\n- ')}`)
  }

  return data
}

/**
 * Track-level counterpart, gating `trackReadiness` advancing to `preview_verified`
 * specifically. Lighter than the release-level gate — it checks only what's knowable
 * from the track itself, and does not touch the two 1B-blocked conditions (those are
 * release-scoped: a release-wide preview attestation and analytics receipt, not a
 * per-track one).
 */
export const validateTrackReadinessTransition: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const nextState = data?.trackReadiness as string | undefined
  const currentState = (originalDoc?.trackReadiness as string | undefined) ?? 'draft'

  if (!nextState || nextState === currentState || nextState !== 'preview_verified') {
    return data
  }

  const merged = { ...(originalDoc ?? {}), ...(data ?? {}) } as {
    audioFile?: unknown
    audioUrl?: string | null
    mimeType?: string | null
    duration?: number | null
    rightsConfirmed?: boolean | null
    lyricsStatus?: string | null
    shareId?: string | null
  }

  const errors: string[] = []

  if (!isNonEmptyString(merged.shareId)) errors.push('shareId is missing.')
  const hasAudio = Boolean(merged.audioFile) || isNonEmptyString(merged.audioUrl)
  if (!hasAudio) errors.push('no audio file or audio URL.')
  if (isNonEmptyString(merged.audioUrl) && !isWellFormedUrl(merged.audioUrl)) errors.push('audio URL is not well-formed.')
  if (!isNonEmptyString(merged.mimeType)) errors.push('MIME type is missing.')
  if (typeof merged.duration !== 'number' || merged.duration <= 0) errors.push('duration is missing or implausible.')
  if (!merged.rightsConfirmed) errors.push('rights are not confirmed.')
  if (merged.lyricsStatus !== 'verified' && merged.lyricsStatus !== 'not_applicable') {
    errors.push(`lyrics status must be "verified" or "not applicable" (currently "${merged.lyricsStatus ?? 'missing'}").`)
  }

  if (errors.length > 0) {
    throw new Error(`Cannot move to "preview_verified":\n- ${errors.join('\n- ')}`)
  }

  return data
}
