import type { CollectionBeforeChangeHook, Payload, PayloadRequest } from 'payload'

import { deepMerge } from '../lib/deepMerge'
import { probeAudioUrl } from '../lib/safeAudioProbe'
import { computeTrackSetFingerprint, type FingerprintableTrack } from '../lib/trackFingerprint'
import { collectValidReleaseThemeTokens } from '../lib/release-theme'
import { FINAL_PUBLICATION_STATES, type ReleaseWorkflowState } from '../access/workflowTransitions'
import { getServerSideURL } from '../utilities/getURL'

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
 *
 * All validation state (the accumulated error list) is request-local — a single
 * module-level array here would corrupt concurrent overlapping requests, since
 * Node's async execution can interleave two in-flight validations of different
 * releases. Every check function takes an `errors: string[]` it appends to, owned by
 * the single top-level call for this request.
 */

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

const checkThemeContrast = (tokens: ThemeTokens, errors: string[]): void => {
  for (const { fg, bg, minRatio, label } of CONTRAST_PAIRS) {
    const fgValue = tokens[fg]
    const bgValue = tokens[bg]
    if (!fgValue || !bgValue) continue // only check pairs the release has actually overridden on both sides
    const ratio = contrastRatio(fgValue, bgValue)
    if (ratio === null) continue // malformed values are already caught by collectValidReleaseThemeTokens
    if (ratio < minRatio) {
      errors.push(`Theme contrast: ${label} is ${ratio.toFixed(2)}:1, below the required ${minRatio}:1.`)
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
    themeRevision?: number | null
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

type TrackLike = FingerprintableTrack & {
  id: number | string
  explicit?: boolean | null
  rightsConfirmed?: boolean | null
  lyricsStatus?: string | null
}

type ReceiptLike = {
  outcome?: string | null
  environment?: string | null
  release?: unknown
  releaseGuid?: string | null
  trackFingerprint?: string | null
  schemaVersion?: number | null
  playerVersion?: string | null
  themeVersion?: number | null
}

const validateReleaseFinalTransition = async (
  payload: Payload,
  req: PayloadRequest,
  release: ReleaseLike,
  errors: string[],
): Promise<void> => {
  // 1. Stable GUIDs
  if (!isNonEmptyString(release.releaseGuid)) {
    errors.push('Release GUID is missing.')
  }

  // 3. Artist
  if (!release.artist) {
    errors.push('Artist is required.')
  }

  // 4. Release date or intentional archive treatment
  const lane = release.distribution?.releaseLane
  if (!release.releaseDate && lane !== 'archive') {
    errors.push('Release date is required unless the release lane is "archive".')
  }

  // 5. Approved cover art + alt text
  if (!release.coverImage) {
    errors.push('Cover image is required.')
  } else {
    const coverId = typeof release.coverImage === 'object' ? (release.coverImage as { id?: unknown }).id : release.coverImage
    if (coverId !== undefined && coverId !== null) {
      const media = await payload
        .findByID({ collection: 'media', id: coverId as string | number, depth: 0, req })
        .catch(() => null)
      if (!media || !isNonEmptyString((media as { alt?: unknown }).alt)) {
        errors.push('Cover image is missing alt text.')
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
        req,
      })
    : { docs: [] }
  const tracks = tracksResult.docs as unknown as TrackLike[]

  if (tracks.length === 0) {
    errors.push('At least one track is required.')
  }

  const trackNumbers = tracks.map((t) => t.trackNumber).filter((n): n is number => typeof n === 'number')
  if (new Set(trackNumbers).size !== trackNumbers.length) {
    errors.push('Duplicate track numbers found — track order must be deterministic.')
  }

  for (const track of tracks) {
    const label = `Track "${track.id}"`

    // 1 (track half): shareId present
    if (!isNonEmptyString(track.shareId)) {
      errors.push(`${label}: missing shareId.`)
    }

    // 6: audio present, well-formed, and reachable — a bounded, SSRF-safe probe,
    // not just a presence check. See src/lib/safeAudioProbe.ts.
    const hasAudioFile = Boolean(track.audioFile)
    const hasAudioUrl = isNonEmptyString(track.audioUrl)
    if (!hasAudioFile && !hasAudioUrl) {
      errors.push(`${label}: no audio file or audio URL.`)
    } else if (hasAudioUrl && !isWellFormedUrl(track.audioUrl)) {
      errors.push(`${label}: audio URL is not well-formed.`)
    } else {
      const resolvedUrl = await resolveTrackAudioUrl(payload, req, track)
      if (resolvedUrl) {
        const probe = await probeAudioUrl(resolvedUrl)
        if (!probe.ok) {
          errors.push(`${label}: audio is not reachable (${probe.reason}).`)
        }
      } else {
        errors.push(`${label}: could not resolve an absolute audio URL to probe.`)
      }
    }

    // 7. MIME type, byte length, duration present and plausible
    if (!isNonEmptyString(track.mimeType)) {
      errors.push(`${label}: MIME type is missing.`)
    }
    if (typeof track.fileSize !== 'number' || track.fileSize <= 0) {
      errors.push(`${label}: byte length (fileSize) is missing or implausible.`)
    }
    if (typeof track.duration !== 'number' || track.duration <= 0) {
      errors.push(`${label}: duration is missing or implausible.`)
    }

    // 10. Explicit-content value set (always has a schema default; kept for
    // documentation/parity with the EO's condition list)
    if (typeof track.explicit !== 'boolean') {
      errors.push(`${label}: explicit-content flag is not set.`)
    }

    // 11. Rights confirmation
    if (!track.rightsConfirmed) {
      errors.push(`${label}: rights are not confirmed.`)
    }

    // 12. Lyrics verified or explicitly not applicable
    if (track.lyricsStatus !== 'verified' && track.lyricsStatus !== 'not_applicable') {
      errors.push(`${label}: lyrics status must be "verified" or "not applicable" (currently "${track.lyricsStatus ?? 'missing'}").`)
    }
  }

  // 13. MYRADIO theme/order valid; no more than one default release
  if (!isNonEmptyString(release.myradio?.theme)) {
    errors.push('MYRADIO theme is required.')
  }
  if (release.myradio?.isDefault && release.id) {
    const others = await payload.find({
      collection: 'releases',
      where: {
        and: [{ 'myradio.isDefault': { equals: true } }, { id: { not_equals: release.id } }],
      },
      depth: 0,
      limit: 1,
      req,
    })
    if (others.totalDocs > 0) {
      errors.push('Another release is already marked as the default MYRADIO channel — only one is allowed.')
    }
  }

  // 14. Theme schema/revision present, tokens valid, contrast checks
  if (!release.myradio?.themeSchemaVersion) {
    errors.push('Theme schema version is missing.')
  }
  const { invalidKeys } = collectValidReleaseThemeTokens(release.myradio?.themeTokens ?? {})
  if (invalidKeys.length > 0) {
    errors.push(`Invalid theme token value(s): ${invalidKeys.join(', ')}.`)
  }
  checkThemeContrast((release.myradio?.themeTokens as ThemeTokens) ?? {}, errors)

  // 16. Embed enabled
  if (!release.distribution?.embedEnabled) {
    errors.push('Embed is not enabled for this release (Distribution → "Embed enabled").')
  }

  // 17. Canonical SHADOW URL/slug
  if (!isWellFormedUrl(release.distribution?.shadowPostUrl)) {
    errors.push('SHADOW post URL is missing or not well-formed.')
  }
  if (!isNonEmptyString(release.distribution?.shadowPostSlug)) {
    errors.push('SHADOW post slug is missing.')
  }

  // 18. Campaign key + analytics schema version
  if (!isNonEmptyString(release.distribution?.campaignKey)) {
    errors.push('Campaign key is missing.')
  }
  if (!release.distribution?.analyticsSchemaVersion) {
    errors.push('Analytics schema version is missing.')
  }

  // 19. PostHog verification receipt — fails closed; Workstream 1B not authorized.
  // A passing receipt must belong to THIS exact release and THIS exact current
  // production configuration: environment, release GUID, the current track-set
  // fingerprint, analytics schema version, and theme revision must all match what
  // the receipt itself recorded at the moment it was created — not merely "some
  // passing receipt exists and points here."
  const receiptPointer = release.analyticsVerification?.latest
  if (!receiptPointer) {
    errors.push(
      'No passing PostHog verification receipt is recorded for this release. This requires the "Verify analytics" action, which is not available until Workstream 1B (the MYRADIO analytics gate) ships. This is expected, not a bug — publication cannot proceed until a real verification has run.',
    )
  } else {
    const receiptId = typeof receiptPointer === 'object' ? (receiptPointer as { id?: unknown }).id : receiptPointer
    const receipt = receiptId
      ? ((await payload
          .findByID({ collection: 'analytics-verification-receipts', id: receiptId as string | number, depth: 0, req })
          .catch(() => null)) as ReceiptLike | null)
      : null

    if (!receipt || receipt.outcome !== 'pass') {
      errors.push('The referenced analytics verification receipt is missing or is not a passing attempt.')
    } else {
      const receiptReleaseId = relIdOf(receipt.release)
      const currentFingerprint = computeTrackSetFingerprint(tracks)
      const mismatches: string[] = []

      if (String(receiptReleaseId ?? '') !== String(release.id ?? '')) {
        mismatches.push('release')
      }
      if (receipt.releaseGuid !== release.releaseGuid) {
        mismatches.push('release GUID')
      }
      if (receipt.trackFingerprint !== currentFingerprint) {
        mismatches.push('track set')
      }
      if (receipt.schemaVersion !== release.distribution?.analyticsSchemaVersion) {
        mismatches.push('analytics schema version')
      }
      if (receipt.themeVersion !== release.myradio?.themeRevision) {
        mismatches.push('theme revision')
      }
      if (!isNonEmptyString(receipt.playerVersion)) {
        // DEMU has no way to know MYRADIO's current live player version in
        // Workstream 1A (there is no query path to it yet) — the strongest check
        // available here is that a genuine verification run recorded *some*
        // player version at all, not a specific expected value.
        mismatches.push('player version (not recorded on the receipt)')
      }
      if (!isNonEmptyString(receipt.environment)) {
        mismatches.push('environment (not recorded on the receipt)')
      }

      if (mismatches.length > 0) {
        errors.push(
          `The recorded analytics verification receipt does not match the release's current configuration (${mismatches.join(', ')}) — re-verify.`,
        )
      }
    }
  }

  // 20. Preview attestation — fails closed; Workstream 1B not authorized.
  const attestation = release.previewAttestation
  if (!isNonEmptyString(attestation?.attestedAt)) {
    errors.push(
      'No preview attestation is recorded for this release. This requires the "Run player preview" action, which is not available until Workstream 1B (real MYRADIO preview routes) ships. This is expected, not a bug — publication cannot proceed until a real preview has been run.',
    )
  } else {
    const currentFingerprint = computeTrackSetFingerprint(tracks)
    const staleReasons: string[] = []
    if (attestation?.themeRevisionAt !== release.myradio?.themeRevision) {
      staleReasons.push('theme has changed since the preview was run')
    }
    if (attestation?.trackFingerprintAt !== currentFingerprint) {
      staleReasons.push('the track list or a track’s audio has changed since the preview was run')
    }
    if (attestation?.schemaVersionAt !== release.distribution?.analyticsSchemaVersion) {
      staleReasons.push('the analytics schema version has changed since the preview was run')
    }
    if (staleReasons.length > 0) {
      errors.push(`Preview attestation is stale (${staleReasons.join('; ')}) — re-run "Run player preview".`)
    }
  }
}

const relIdOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in (value as Record<string, unknown>) ? (value as Record<string, unknown>).id : value

/** Resolves a track's audio source to an absolute URL the probe can fetch. */
const resolveTrackAudioUrl = async (
  payload: Payload,
  req: PayloadRequest,
  track: { audioUrl?: string | null; audioFile?: unknown },
): Promise<string | null> => {
  if (isNonEmptyString(track.audioUrl)) {
    return track.audioUrl
  }

  if (track.audioFile) {
    const fileId = relIdOf(track.audioFile)
    if (fileId === undefined || fileId === null) return null
    const media = await payload
      .findByID({ collection: 'audio-media', id: fileId as string | number, depth: 0, req })
      .catch(() => null)
    const relativeOrAbsoluteUrl = (media as { url?: string | null } | null)?.url
    if (!relativeOrAbsoluteUrl) return null
    if (relativeOrAbsoluteUrl.startsWith('http://') || relativeOrAbsoluteUrl.startsWith('https://')) {
      return relativeOrAbsoluteUrl
    }
    try {
      return new URL(relativeOrAbsoluteUrl, getServerSideURL()).toString()
    } catch {
      return null
    }
  }

  return null
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
  const isFinalTierTarget = nextState !== undefined && (FINAL_PUBLICATION_STATES.has(nextState) || nextState === 'analytics_verified')
  if (!nextState || nextState === currentState || !isFinalTierTarget) {
    return data
  }

  const errors: string[] = []
  // Deep merge, not a shallow spread: `data` may be a sparse/partial payload for
  // nested groups (see src/lib/deepMerge.ts) — a shallow merge here would let a
  // request touching only one field of e.g. `distribution` silently wipe every
  // other field of that group for validation purposes.
  const merged = deepMerge((originalDoc ?? {}) as Record<string, unknown>, (data ?? {}) as Record<string, unknown>) as ReleaseLike
  merged.id = originalDoc?.id ?? data?.id

  await validateReleaseFinalTransition(req.payload, req, merged, errors)

  if (errors.length > 0) {
    throw new Error(`Cannot move to "${nextState}":\n- ${errors.join('\n- ')}`)
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
export const validateTrackReadinessTransition: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const nextState = data?.trackReadiness as string | undefined
  const currentState = (originalDoc?.trackReadiness as string | undefined) ?? 'draft'

  if (!nextState || nextState === currentState || nextState !== 'preview_verified') {
    return data
  }

  const merged = deepMerge((originalDoc ?? {}) as Record<string, unknown>, (data ?? {}) as Record<string, unknown>) as {
    audioFile?: unknown
    audioUrl?: string | null
    mimeType?: string | null
    fileSize?: number | null
    duration?: number | null
    rightsConfirmed?: boolean | null
    lyricsStatus?: string | null
    shareId?: string | null
  }

  const errors: string[] = []

  if (!isNonEmptyString(merged.shareId)) errors.push('shareId is missing.')
  const hasAudio = Boolean(merged.audioFile) || isNonEmptyString(merged.audioUrl)
  if (!hasAudio) {
    errors.push('no audio file or audio URL.')
  } else if (isNonEmptyString(merged.audioUrl) && !isWellFormedUrl(merged.audioUrl)) {
    errors.push('audio URL is not well-formed.')
  } else {
    const resolvedUrl = await resolveTrackAudioUrl(req.payload, req, merged)
    if (resolvedUrl) {
      const probe = await probeAudioUrl(resolvedUrl)
      if (!probe.ok) errors.push(`audio is not reachable (${probe.reason}).`)
    } else {
      errors.push('could not resolve an absolute audio URL to probe.')
    }
  }
  if (!isNonEmptyString(merged.mimeType)) errors.push('MIME type is missing.')
  if (typeof merged.fileSize !== 'number' || merged.fileSize <= 0) errors.push('byte length (fileSize) is missing or implausible.')
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
