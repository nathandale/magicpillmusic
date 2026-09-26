import { createHash } from 'node:crypto'

import { SHARE_CARD_LAYOUTS, type ShareCardLayout } from '../../fields/shareCard'

/**
 * Pure resolution of a share card: Release default → Track override → built-in
 * defaults, with {track}/{artist}/{release}/{year} expanded. The feed, the image
 * route and the admin preview all go through here so they can never disagree.
 */

/** Bump when the rendered templates change, so every card URL (and every app's cached preview) refreshes. */
export const SHARE_CARD_RENDERER_VERSION = 1

export type MediaRef = {
  id: number | string
  filename?: string | null
  url?: string | null
  focalX?: number | null
  focalY?: number | null
  updatedAt?: string | null
}

type MediaInput = MediaRef | number | string | null | undefined

export type ShareCardDesign = {
  useReleaseDefault?: boolean | null
  layout?: string | null
  kicker?: string | null
  accentColor?: string | null
  headline?: string | null
  subline?: string | null
  showWordmark?: string | null
  artwork?: MediaInput
  background?: MediaInput
  image?: MediaInput
  linkTitle?: string | null
  linkDescription?: string | null
}

export type ResolvedShareCard = {
  layout: ShareCardLayout
  kicker: string
  accentColor: string
  headline: string
  subline: string
  showWordmark: boolean
  artwork: MediaInput
  background: MediaInput
  image: MediaInput
  linkTitle: string
  linkDescription: string
}

export type TrackCardInput = {
  releaseCard?: ShareCardDesign | null
  trackCard?: ShareCardDesign | null
  track: { title?: string | null; artwork?: MediaInput; shareExcerpt?: string | null; year?: number | null }
  release: {
    title?: string | null
    description?: string | null
    coverImage?: MediaInput
    distribution?: { shareTitle?: string | null; shareDescription?: string | null } | null
  }
  artistName?: string | null
}

const DEFAULT_ACCENT = '#db495a'

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const media = (value: MediaInput): MediaInput => (value === '' ? null : value ?? null)
const first = <T,>(...values: T[]): T | undefined => values.find((value) => value !== null && value !== undefined && value !== '')

const layoutOf = (value: unknown, fallback: ShareCardLayout): ShareCardLayout =>
  SHARE_CARD_LAYOUTS.includes(value as ShareCardLayout) ? (value as ShareCardLayout) : fallback

const accentOf = (value: unknown): string => (/^#[0-9a-fA-F]{6}$/.test(text(value)) ? text(value) : DEFAULT_ACCENT)

export const expandTokens = (template: string, tokens: Record<string, string>): string =>
  template.replace(/\{(track|artist|release|year)\}/gi, (_match, key: string) => tokens[key.toLowerCase()] ?? '').replace(/\s+/g, ' ').trim()

export const resolveTrackShareCard = ({ releaseCard, trackCard, track, release, artistName }: TrackCardInput): ResolvedShareCard => {
  const base = releaseCard ?? {}
  // Unticking “Use default card from Release” turns the track's fields on; any it
  // leaves blank still inherit the release value.
  const override: ShareCardDesign = trackCard?.useReleaseDefault === false ? trackCard : {}
  const pick = (key: keyof ShareCardDesign): string => text(first(text(override[key]), text(base[key])))

  const tokens = {
    track: text(track.title),
    artist: text(artistName) || 'Nathan Dale',
    release: text(release.title),
    year: track.year ? String(track.year) : '',
  }
  const expand = (value: string) => expandTokens(value, tokens)

  return {
    layout: layoutOf(first(override.layout, base.layout), 'broadcast'),
    kicker: expand(pick('kicker')),
    accentColor: accentOf(first(text(override.accentColor), text(base.accentColor))),
    headline: expand(pick('headline') || '{track}'),
    subline: expand(pick('subline') || '{artist}'),
    showWordmark: (first(override.showWordmark, base.showWordmark) ?? 'show') !== 'hide',
    artwork: media(first(media(override.artwork), media(base.artwork), media(track.artwork), media(release.coverImage))),
    background: media(first(media(override.background), media(base.background))),
    image: media(first(media(override.image), media(base.image))),
    linkTitle: expand(
      first(text(override.linkTitle), text(base.linkTitle), text(release.distribution?.shareTitle)) || '{track} by {artist} | MY RADIO',
    ),
    // The most specific copy wins: a song's own excerpt beats the release-wide line.
    linkDescription: expand(
      first(
        text(override.linkDescription),
        text(track.shareExcerpt),
        text(base.linkDescription),
        text(release.distribution?.shareDescription),
        text(release.description),
      ) || 'Listen to {track} by {artist} on MY RADIO.',
    ),
  }
}

export const resolveSiteShareCard = (siteCard: ShareCardDesign | null | undefined): ResolvedShareCard => {
  const card = siteCard ?? {}
  return {
    layout: layoutOf(card.layout, 'terrestrial'),
    kicker: text(card.kicker),
    accentColor: accentOf(card.accentColor),
    headline: text(card.headline) || 'MY RADIO',
    subline: text(card.subline) || 'NATHAN DALE',
    showWordmark: card.showWordmark !== 'hide',
    artwork: null,
    background: media(card.background),
    image: media(card.image),
    linkTitle: text(card.linkTitle) || 'MY RADIO / Nathan Dale',
    linkDescription: text(card.linkDescription) || 'Listen to Nathan Dale on MY RADIO.',
  }
}

const mediaKey = (value: MediaInput): unknown => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return value
  return [value.id, value.filename ?? null, value.updatedAt ?? null, value.focalX ?? null, value.focalY ?? null]
}

/** Short content hash of everything that affects the pixels; used as the ?v= cache key. */
export const shareCardVersion = (card: ResolvedShareCard): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        SHARE_CARD_RENDERER_VERSION,
        card.layout,
        card.kicker,
        card.accentColor,
        card.headline,
        card.subline,
        card.showWordmark,
        mediaKey(card.artwork),
        mediaKey(card.background),
        mediaKey(card.image),
      ]),
    )
    .digest('hex')
    .slice(0, 16)
