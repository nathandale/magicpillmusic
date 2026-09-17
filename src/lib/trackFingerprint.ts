import { createHash } from 'node:crypto'

/**
 * Deterministic fingerprint of everything about a release's track set that a
 * preview attestation depends on: stable identity, order, the actual audio
 * source, and duration. Used by the publish-validation hook to detect whether a
 * previously-run preview is stale.
 *
 * Order matters — a release with the same tracks in a different order is a
 * different listening experience and must invalidate the attestation. The
 * original fingerprint sorted the per-track strings alphabetically before
 * joining, which silently discarded track order; this version preserves
 * `trackNumber` order explicitly instead.
 */
export type FingerprintableTrack = {
  shareId?: string | null
  guid?: string | null
  trackNumber?: number | null
  duration?: number | null
  mimeType?: string | null
  fileSize?: number | null
  audioUrl?: string | null
  audioFile?: unknown
}

const audioIdentity = (track: FingerprintableTrack): string => {
  if (track.audioFile !== undefined && track.audioFile !== null) {
    const id = typeof track.audioFile === 'object' ? (track.audioFile as { id?: unknown }).id : track.audioFile
    if (id !== undefined && id !== null) return `file:${id}`
  }
  if (track.audioUrl) return `url:${track.audioUrl}`
  return 'audio:none'
}

export const computeTrackSetFingerprint = (tracks: FingerprintableTrack[]): string => {
  const ordered = [...tracks].sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))

  const parts = ordered.map((t) =>
    [
      t.trackNumber ?? '',
      t.shareId ?? t.guid ?? '',
      audioIdentity(t),
      t.duration ?? '',
      t.mimeType ?? '',
      t.fileSize ?? '',
    ].join(':'),
  )

  // Hashed rather than stored raw: keeps the stored `trackFingerprintAt` value
  // bounded regardless of track count, and avoids leaking audio URLs/file IDs into
  // an admin-visible text field.
  return createHash('sha256').update(parts.join('|')).digest('hex')
}
