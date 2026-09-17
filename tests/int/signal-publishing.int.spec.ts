import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Workstream 1A (ND-MR-001) coverage: access control on the new workflow fields and
 * the append-only receipts collection, and the publish-validation hook's fail-closed
 * behavior for the two conditions that depend on Workstream 1B infrastructure that
 * doesn't exist yet. Run against an isolated scratch database — see the Workstream 1A
 * completion report for how DATABASE_URL is pointed there for this run.
 */

let payload: Payload

const unique = () => Math.random().toString(36).slice(2, 10)

const makeUser = async (roles: ('admin' | 'publisher' | 'artist')[]) => {
  const email = `${unique()}@example.test`
  return payload.create({
    collection: 'users',
    data: { email, password: 'test-password-123', roles },
  })
}

const makeArtist = async () => {
  const slug = `artist-${unique()}`
  return payload.create({ collection: 'artists', data: { name: 'Test Artist', slug } })
}

const makeDraftRelease = async (artistId: number) => {
  const slug = `release-${unique()}`
  return payload.create({
    collection: 'releases',
    data: {
      title: 'Test Release',
      slug,
      type: 'single',
      artist: artistId,
    },
  })
}

describe('Workstream 1A: access control and validation', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  describe('append-only AnalyticsVerificationReceipts', () => {
    it('allows a publisher to create a receipt', async () => {
      const publisher = await makeUser(['publisher'])
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: { release: release.id, environment: 'production', outcome: 'fail' },
        user: publisher,
        overrideAccess: false,
      })

      expect(receipt.id).toBeDefined()
      expect(receipt.outcome).toBe('fail')
    })

    it('rejects update and delete for every role, including admin', async () => {
      const admin = await makeUser(['admin'])
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: { release: release.id, environment: 'production', outcome: 'fail' },
        user: admin,
        overrideAccess: false,
      })

      await expect(
        payload.update({
          collection: 'analytics-verification-receipts',
          id: receipt.id,
          data: { notes: 'trying to edit history' },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow()

      await expect(
        payload.delete({
          collection: 'analytics-verification-receipts',
          id: receipt.id,
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('a passing receipt updates the release pointer and last-known-good summary', async () => {
      const admin = await makeUser(['admin'])
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'production',
          outcome: 'pass',
          schemaVersion: 1,
          playerVersion: '1.2.3',
          themeVersion: 4,
        },
        user: admin,
        overrideAccess: false,
      })

      const updated = await payload.findByID({ collection: 'releases', id: release.id, depth: 0 })
      const av = updated.analyticsVerification as { latest?: unknown; summary?: { schemaVersion?: number } } | null

      expect(av?.latest).toBe(receipt.id)
      expect(av?.summary?.schemaVersion).toBe(1)
    })
  })

  describe('Releases.workflowState field access (decision 2: no editor role, publisher/admin advance, admin-only final states)', () => {
    it('an authenticated artist can save other fields without touching workflowState', async () => {
      const artist = await makeUser(['artist'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { description: 'updated by an ordinary authenticated user' },
        user: artist,
        overrideAccess: false,
      })

      expect(updated.description).toBe('updated by an ordinary authenticated user')
      expect(updated.workflowState).toBe('draft')
    })

    it('an artist (non-publisher) cannot advance workflowState past draft', async () => {
      const artist = await makeUser(['artist'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { workflowState: 'media_ready' },
        user: artist,
        overrideAccess: false,
      })

      // Field-level access silently drops a disallowed field change rather than
      // throwing (standard Payload field-access behavior) — assert it did NOT apply.
      expect(updated.workflowState).toBe('draft')
    })

    it('a publisher can advance to media_ready but not to scheduled/published', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const advanced = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { workflowState: 'media_ready' },
        user: publisher,
        overrideAccess: false,
      })
      expect(advanced.workflowState).toBe('media_ready')

      const blocked = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { workflowState: 'scheduled' },
        user: publisher,
        overrideAccess: false,
      })
      // Field access blocks a publisher from setting the final-publication tier —
      // it stays at whatever it last successfully was.
      expect(blocked.workflowState).not.toBe('scheduled')
    })
  })

  describe('Publish-validation hook fails closed on Workstream-1B-dependent conditions (decision 3 & 4)', () => {
    it('blocks a transition to analytics_verified on an otherwise-empty release, citing the missing preview attestation and analytics receipt', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'analytics_verified' },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/Workstream 1B/)
    })

    it('blocks a transition to published for the same reason, even for an admin', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'published' },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/preview attestation|analytics verification receipt/i)
    })

    it('does not run its checks for ordinary draft edits that do not touch workflowState', async () => {
      const artist = await makeUser(['artist'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { description: 'no workflow transition here' },
          user: artist,
          overrideAccess: false,
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('Tracks.trackReadiness (decision 5: no scheduling/publication states on Tracks)', () => {
    it('blocks preview_verified on a track missing rights confirmation and lyrics status', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const track = await payload.create({
        collection: 'tracks',
        data: { title: 'Test Track', slug: `track-${unique()}`, release: release.id, trackNumber: 1 },
      })

      await expect(
        payload.update({
          collection: 'tracks',
          id: track.id,
          data: { trackReadiness: 'preview_verified' },
          user: publisher,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('shareId is auto-populated from guid on create, never null', async () => {
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const track = await payload.create({
        collection: 'tracks',
        data: { title: 'Test Track 2', slug: `track-${unique()}`, release: release.id, trackNumber: 1 },
      })

      expect(track.shareId).toBeTruthy()
      expect(track.shareId).toBe(track.guid)
    })
  })
})
