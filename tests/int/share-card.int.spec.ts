import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { buildReleaseFeedXml } from '@/lib/feed-builder'
import { renderShareCard } from '@/lib/share-card/render'
import { expandTokens, resolveSiteShareCard, resolveTrackShareCard, shareCardVersion } from '@/lib/share-card/resolve'
import { manageReleaseServerFields, protectPublishedReleaseTrackMutation } from '@/hooks/managePublicationState'

/**
 * Share cards (src/fields/shareCard.ts): Release default → Track override →
 * built-in defaults, rendered as the link-preview image MY RADIO advertises.
 */

const release = {
  title: 'Major Keys Parade',
  description: 'Release description.',
  coverImage: { id: 10, filename: 'cover.jpg' },
}
const track = { title: 'Face First', artwork: { id: 11, filename: 'face-first.webp' }, shareExcerpt: null, year: 2019 }

describe('share card resolution', () => {
  it('uses the release default with each song’s own title and artwork', () => {
    const card = resolveTrackShareCard({
      releaseCard: { layout: 'poster', kicker: '{release} / {year}', headline: '{track}', subline: '{artist}' },
      trackCard: { useReleaseDefault: true, headline: 'IGNORED' },
      track,
      release,
      artistName: 'Nathan Dale',
    })
    expect(card.layout).toBe('poster')
    expect(card.kicker).toBe('Major Keys Parade / 2019')
    expect(card.headline).toBe('Face First')
    expect(card.subline).toBe('Nathan Dale')
    expect(card.artwork).toEqual(track.artwork)
    expect(card.linkTitle).toBe('Face First by Nathan Dale | MY RADIO')
  })

  it('applies a track override only when the release default is unticked, inheriting blank fields', () => {
    const card = resolveTrackShareCard({
      releaseCard: { layout: 'broadcast', kicker: 'FROM {release}', accentColor: '#112233' },
      trackCard: { useReleaseDefault: false, layout: 'terrestrial', headline: 'A different line', kicker: '', artwork: { id: 99, filename: 'alt.jpg' } },
      track,
      release,
      artistName: 'Nathan Dale',
    })
    expect(card.layout).toBe('terrestrial')
    expect(card.headline).toBe('A different line')
    expect(card.kicker).toBe('FROM Major Keys Parade') // blank override inherits
    expect(card.accentColor).toBe('#112233')
    expect(card.artwork).toEqual({ id: 99, filename: 'alt.jpg' })
  })

  it('falls back to the release cover, then prefers the song excerpt over release-wide copy', () => {
    const card = resolveTrackShareCard({
      releaseCard: { linkDescription: 'Release-wide line.' },
      track: { title: 'Untitled', shareExcerpt: 'The song’s own excerpt.' },
      release,
    })
    expect(card.artwork).toEqual(release.coverImage)
    expect(card.linkDescription).toBe('The song’s own excerpt.')
    expect(card.subline).toBe('Nathan Dale')
  })

  it('never publishes the hidden legacy share fields, and falls back to the song description', () => {
    const card = resolveTrackShareCard({
      track: { title: 'My Radio (Analog Innocence)', description: 'The song’s own description.' },
      release: { ...release, distribution: { shareTitle: 'Legacy — title', shareDescription: 'Legacy—copy.' } } as never,
      artistName: 'Nathan Dale',
    })
    expect(card.linkTitle).toBe('My Radio (Analog Innocence) by Nathan Dale | MY RADIO')
    expect(card.linkDescription).toBe('The song’s own description.')
  })

  it('rejects unknown layouts and bad colors instead of passing them to the renderer', () => {
    const card = resolveTrackShareCard({ releaseCard: { layout: 'nope', accentColor: 'red' }, track, release })
    expect(card.layout).toBe('broadcast')
    expect(card.accentColor).toBe('#db495a')
  })

  it('expands only the known tokens', () => {
    expect(expandTokens('{TRACK} / {unknown} / {artist}', { track: 'A', artist: 'B' })).toBe('A / {unknown} / B')
  })

  it('site card defaults reproduce the homepage card', () => {
    const card = resolveSiteShareCard(null)
    expect(card).toMatchObject({ layout: 'terrestrial', headline: 'MY RADIO', subline: 'NATHAN DALE', linkTitle: 'MY RADIO / Nathan Dale' })
  })

  it('versions change with the pixels but not with link text', () => {
    const a = resolveTrackShareCard({ track, release })
    const b = resolveTrackShareCard({ track, release, releaseCard: { linkTitle: 'Different title' } })
    const c = resolveTrackShareCard({ track, release, releaseCard: { headline: 'Different headline' } })
    expect(shareCardVersion(a)).toBe(shareCardVersion(b))
    expect(shareCardVersion(a)).not.toBe(shareCardVersion(c))
  })
})

describe('share card feed tags', () => {
  it('emits a versioned card image and link text for each shareable track', () => {
    const xml = buildReleaseFeedXml({
      release: {
        id: 1,
        title: 'Card Release',
        slug: 'card-release',
        type: 'single',
        artist: { id: 1, name: 'Nathan Dale', slug: 'nathan-dale' } as never,
        explicit: false,
        releaseGuid: 'mpm-card-1',
        shareCard: { layout: 'broadcast', headline: '{track}', linkDescription: 'Hear {track} on MY RADIO.' },
      } as never,
      tracks: [{ id: 5, title: 'Song & Dance', trackNumber: 1, audioUrl: 'https://cdn.example/a.mp3', shareId: 'mpm-track-5' } as never],
      valueSplits: [],
      settings: {} as never,
      feedSlug: 'card-release',
      baseFeedUrl: 'https://magicpillmusic.com',
    })
    expect(xml).toMatch(/purpose="myradio:card-image">https:\/\/magicpillmusic\.com\/cards\/track\/mpm-track-5\?v=[0-9a-f]{16}</)
    expect(xml).toContain('purpose="myradio:card-title">Song &amp; Dance by Nathan Dale | MY RADIO<')
    expect(xml).toContain('purpose="myradio:card-description">Hear Song &amp; Dance on MY RADIO.<')
  })
})

describe('share cards stay editable on a live release', () => {
  const liveRelease = {
    id: 1,
    title: 'Published title',
    workflowState: 'published',
    status: 'published',
    distribution: { publicVisibility: 'public', analyticsSchemaVersion: 1 },
    myradio: { themeRevision: 2 },
    previewAttestation: { attestedAt: '2026-09-18T00:00:00.000Z' },
    shareCard: { layout: 'broadcast' },
  }

  it('accepts a release share card edit without clearing preview attestation', async () => {
    const result = (await manageReleaseServerFields({
      operation: 'update',
      originalDoc: liveRelease,
      data: { shareCard: { layout: 'poster', kicker: 'NEW' }, workflowState: 'published' },
      context: {},
    } as never)) as Record<string, unknown>
    expect(result.previewAttestation).toBeUndefined()
    expect((result.myradio as { themeRevision?: number } | undefined)?.themeRevision ?? 2).toBe(2)
  })

  it('still rejects other content edits on the same live release', async () => {
    await expect(
      manageReleaseServerFields({
        operation: 'update',
        originalDoc: liveRelease,
        data: { title: 'Changed', shareCard: { layout: 'poster' }, workflowState: 'published' },
        context: {},
      } as never),
    ).rejects.toThrow(/Move workflowState out of the final-publication states/)
  })

  it('accepts a track share card override on a live release', async () => {
    const req = { query: {}, payload: { findByID: async () => ({ workflowState: 'published' }) } }
    const originalDoc = { id: 2, release: 1, title: 'Live', audioUrl: '/a.mp3', _status: 'published', rightsConfirmed: true }
    await expect(
      protectPublishedReleaseTrackMutation({
        operation: 'update',
        originalDoc,
        data: { shareCard: { useReleaseDefault: false, layout: 'poster' } },
        req,
        context: {},
      } as never),
    ).resolves.toBeDefined()
  })
})

describe('share card rendering', () => {
  it('renders every layout to a 1200×630 JPEG, even without artwork', async () => {
    for (const layout of ['broadcast', 'poster', 'terrestrial', 'image']) {
      const card = resolveTrackShareCard({ releaseCard: { layout }, track: { title: 'No Artwork Song' }, release: { title: 'R' } })
      const meta = await sharp(await renderShareCard(card)).metadata()
      expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1200, 630])
    }
  }, 60_000)
})
