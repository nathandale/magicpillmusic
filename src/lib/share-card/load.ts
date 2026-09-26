import type { Payload, Where } from 'payload'

import type { Release, Track } from '@/payload-types'
import { renderShareCard } from './render'
import {
  type MediaRef,
  type ResolvedShareCard,
  type ShareCardDesign,
  resolveSiteShareCard,
  resolveTrackShareCard,
  shareCardVersion,
} from './resolve'

/** Same four conditions the public release feed requires (see feeds/[slug]/route.ts). */
export const PUBLIC_RELEASE_WHERE: Where[] = [
  { _status: { equals: 'published' } },
  { workflowState: { equals: 'published' } },
  { status: { equals: 'published' } },
  { 'distribution.publicVisibility': { equals: 'public' } },
]

export const SHARE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/

const artistNameOf = (release: Pick<Release, 'artist'>): string =>
  typeof release.artist === 'object' && release.artist ? release.artist.name ?? '' : ''

export const resolveCardForTrack = (release: Release, track: Track, trackCard?: ShareCardDesign | null, releaseCard?: ShareCardDesign | null) =>
  resolveTrackShareCard({
    releaseCard: (releaseCard ?? release.shareCard) as ShareCardDesign | null,
    trackCard: (trackCard ?? track.shareCard) as ShareCardDesign | null,
    track: { title: track.title, artwork: track.artwork as ShareCardDesign['artwork'], shareExcerpt: track.shareExcerpt, description: track.description, year: track.year },
    release: {
      title: release.title,
      description: release.description,
      coverImage: release.coverImage as ShareCardDesign['artwork'],
    },
    artistName: artistNameOf(release),
  })

export const findPublicTrackCard = async (payload: Payload, shareId: string): Promise<ResolvedShareCard | null> => {
  const { docs: tracks } = await payload.find({
    collection: 'tracks',
    where: { and: [{ shareId: { equals: shareId } }, { _status: { equals: 'published' } }] },
    depth: 1,
    limit: 1,
  })
  const track = tracks[0]
  const releaseId = typeof track?.release === 'object' ? track.release?.id : track?.release
  if (!track || !releaseId) return null
  const { docs: releases } = await payload.find({
    collection: 'releases',
    where: { and: [{ id: { equals: releaseId } }, ...PUBLIC_RELEASE_WHERE] },
    depth: 1,
    limit: 1,
  })
  return releases[0] ? resolveCardForTrack(releases[0], track) : null
}

export const findSiteCard = async (payload: Payload): Promise<ResolvedShareCard> => {
  const settings = await payload.findGlobal({ slug: 'myradio-settings', depth: 1 })
  return resolveSiteShareCard(settings?.siteCard as ShareCardDesign | null)
}

/** Admin form state carries upload fields as bare IDs; swap in the Media docs the renderer needs. */
export const populateDesignMedia = async (payload: Payload, design: ShareCardDesign | null | undefined): Promise<ShareCardDesign> => {
  const copy: ShareCardDesign = { ...(design ?? {}) }
  const keys = ['artwork', 'background', 'image'] as const
  const ids = keys.map((key) => copy[key]).filter((value): value is number | string => typeof value === 'number' || typeof value === 'string')
  if (ids.length === 0) return copy
  const { docs } = await payload.find({ collection: 'media', where: { id: { in: ids } }, depth: 0, limit: ids.length })
  for (const key of keys) {
    const value = copy[key]
    if (typeof value === 'number' || typeof value === 'string') copy[key] = (docs.find((doc) => String(doc.id) === String(value)) as MediaRef | undefined) ?? null
  }
  return copy
}

// Small in-process cache: rendering is ~100ms of CPU, and crawlers refetch often.
const MAX_CACHED = 64
const rendered = new Map<string, Buffer>()

export const renderCached = async (card: ResolvedShareCard): Promise<{ body: Buffer; version: string }> => {
  const version = shareCardVersion(card)
  const hit = rendered.get(version)
  if (hit) return { body: hit, version }
  const body = await renderShareCard(card)
  rendered.set(version, body)
  if (rendered.size > MAX_CACHED) rendered.delete(rendered.keys().next().value as string)
  return { body, version }
}

export const cardImageResponse = (body: Buffer, version: string, requestedVersion: string | null, extraHeaders: Record<string, string> = {}) =>
  new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/jpeg',
      ETag: `"${version}"`,
      // A ?v= that matches the content is immutable; anything else is short-lived.
      'Cache-Control': requestedVersion === version ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  })
