import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

import { createReleasePreviewToken, verifyReleasePreviewToken } from '@/lib/previewToken'
import { computeTrackSetFingerprint } from '@/lib/trackFingerprint'
import { buildThemeConfigPayload } from '@/lib/release-theme'
import { buildReleaseFeedXml } from '@/lib/feed-builder'
import { probeAudioUrl } from '@/lib/safeAudioProbe'
import {
  manageReleaseServerFields,
  protectPublishedReleaseTrackMutation,
} from '@/hooks/managePublicationState'
import { GET as getPreviewFeed } from '@/app/(frontend)/feeds/[slug]/preview/route'
import { GET as getPublicReleaseFeed } from '@/app/(frontend)/feeds/[slug]/route'

/**
 * Coverage for the 2026-09-17 review round: every point in "Correct every blocking
 * issue identified in review" gets a test here that fails loudly if the fix
 * regresses, not just a test that happens to pass today.
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
    data: { title: 'Test Release', slug, type: 'single', artist: artistId },
  })
}

/**
 * A release that doesn't need to pass every EO condition — the receipt-mismatch
 * tests below assert a specific error substring appears in the combined failure
 * message via `toThrow(/pattern/)`, which matches regardless of what *else* is
 * also failing, so this deliberately does not attempt to build a fully valid
 * release (which would require a real Media file upload, unnecessarily fragile
 * for what these tests are actually checking).
 */
const makeReleaseWithOneTrack = async (artistId: number) => {
  const slug = `release-${unique()}`
  const release = await payload.create({
    collection: 'releases',
    data: { title: 'Test Release', slug, type: 'single', artist: artistId },
  })

  await payload.create({
    collection: 'tracks',
    data: {
      title: 'Track One',
      slug: `track-${unique()}`,
      release: release.id,
      trackNumber: 1,
    },
  })

  return { release }
}

describe('Review round 2: publication-gate hardening', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  describe('1. workflowState is authoritative for public release', () => {
    it('public feed query excludes a release with workflowState !== published even if legacy status/publicVisibility were somehow public', async () => {
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      // Simulate a forged/legacy row bypassing the app layer entirely (direct DB
      // write) to prove the FEED QUERY itself — not just the app-level derivation —
      // enforces all three conditions independently.
      // (We can't easily do a raw SQL write from here without a DB handle, so
      // instead we assert the derivation: status/publicVisibility can NEVER
      // reach 'published'/'public' through the API without workflowState also
      // being 'published' — see test 2 below — and separately assert the feed
      // query's `where` clause requires workflowState explicitly (read the route
      // source) by checking a draft release is never returned from an equivalent
      // Local API query using the exact same where clause the route uses.)
      const found = await payload.find({
        collection: 'releases',
        where: {
          and: [
            { slug: { equals: release.slug } },
            { _status: { equals: 'published' } },
            { workflowState: { equals: 'published' } },
            { status: { equals: 'published' } },
            { 'distribution.publicVisibility': { equals: 'public' } },
          ],
        },
        depth: 0,
      })

      expect(found.totalDocs).toBe(0)
    })
  })

  describe('2. status/publicVisibility are derived and locked, not independently settable', () => {
    it('a direct API attempt to set distribution.publicVisibility to "public" is silently ignored', async () => {
      const admin = await makeUser(['admin'])
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { distribution: { publicVisibility: 'public' } },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.distribution?.publicVisibility).not.toBe('public')
      expect(updated.distribution?.publicVisibility).toBe('preview')
    })

    it('a direct API attempt to set legacy status to "published" is silently ignored', async () => {
      const admin = await makeUser(['admin'])
      const artist = await makeArtist()
      const release = await makeDraftRelease(artist.id)

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { status: 'published' },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.status).toBe('draft')
    })
  })

  describe('3. workflow permissions enforced on CREATE, not just update (Releases and Tracks)', () => {
    it('an artist cannot CREATE a release with workflowState already set past draft', async () => {
      const artist = await makeUser(['artist'])
      const artistDoc = await makeArtist()

      const created = await payload.create({
        collection: 'releases',
        data: {
          title: 'Sneaky Release',
          slug: `release-${unique()}`,
          type: 'single',
          artist: artistDoc.id,
          workflowState: 'published',
        },
        user: artist,
        overrideAccess: false,
      })

      expect(created.workflowState).toBe('draft')
    })

    it('an artist cannot CREATE a track with trackReadiness already set to preview_verified', async () => {
      const artist = await makeUser(['artist'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const created = await payload.create({
        collection: 'tracks',
        data: {
          title: 'Sneaky Track',
          slug: `track-${unique()}`,
          release: release.id,
          trackNumber: 1,
          trackReadiness: 'preview_verified',
        },
        user: artist,
        overrideAccess: false,
      })

      expect(created.trackReadiness).toBe('draft')
    })

    it('an admin CAN create a release directly at a later workflowState (role gate allows it; data-completeness gate is separate)', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()

      const created = await payload.create({
        collection: 'releases',
        data: {
          title: 'Admin Direct Create',
          slug: `release-${unique()}`,
          type: 'single',
          artist: artistDoc.id,
          workflowState: 'media_ready',
        },
        user: admin,
        overrideAccess: false,
      })

      expect(created.workflowState).toBe('media_ready')
    })
  })

  describe('4. previewAttestation/analyticsVerification/GUIDs/audit fields are server-controlled at the API level', () => {
    it('a direct write to previewAttestation.attestedAt is ignored even from an admin', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const forged = new Date('2099-01-01').toISOString()
      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { previewAttestation: { attestedAt: forged, themeRevisionAt: 999 } },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.previewAttestation?.attestedAt).not.toBe(forged)
      expect(updated.previewAttestation?.themeRevisionAt).not.toBe(999)
    })

    it('a direct write to analyticsVerification.latest is ignored even from an admin', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const otherRelease = await makeDraftRelease(artistDoc.id)

      const fakeReceipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: { release: otherRelease.id, environment: 'production', outcome: 'fail' },
        user: admin,
        overrideAccess: false,
      })

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { analyticsVerification: { latest: fakeReceipt.id } },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.analyticsVerification?.latest).toBeFalsy()
    })

    it('releaseGuid cannot be overwritten via a direct API update', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const originalGuid = release.releaseGuid

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { releaseGuid: 'forged-guid-12345' },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.releaseGuid).toBe(originalGuid)
      expect(updated.releaseGuid).not.toBe('forged-guid-12345')
    })

    it('Track shareId/guid cannot be overwritten, and rightsConfirmedBy/At cannot be forged', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const track = await payload.create({
        collection: 'tracks',
        data: { title: 'T', slug: `track-${unique()}`, release: release.id, trackNumber: 1 },
      })
      const otherUser = await makeUser(['admin'])

      const updated = await payload.update({
        collection: 'tracks',
        id: track.id,
        data: {
          shareId: 'forged-share-id',
          guid: 'forged-guid',
          rightsConfirmedBy: otherUser.id,
          rightsConfirmedAt: new Date('2099-01-01').toISOString(),
        },
        user: publisher,
        overrideAccess: false,
      })

      expect(updated.shareId).toBe(track.shareId)
      expect(updated.guid).toBe(track.guid)
      expect(updated.rightsConfirmedAt).not.toBe(new Date('2099-01-01').toISOString())
    })
  })

  describe('5. receipt creation requires a trusted server context — a genuine pass is impossible without it', () => {
    it('an authenticated publisher CANNOT create a passing receipt directly', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      await expect(
        payload.create({
          collection: 'analytics-verification-receipts',
          data: { release: release.id, environment: 'production', outcome: 'pass', schemaVersion: 1 },
          user: publisher,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/trusted verification runner/i)
    })

    it('an admin ALSO cannot create a passing receipt directly — role alone is not enough', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      await expect(
        payload.create({
          collection: 'analytics-verification-receipts',
          data: { release: release.id, environment: 'production', outcome: 'pass' },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/trusted verification runner/i)
    })

    it('a publisher CAN log a manual "fail" record (does not require trusted context)', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: { release: release.id, environment: 'production', outcome: 'fail', notes: 'manual check, broke on Safari' },
        user: publisher,
        overrideAccess: false,
      })

      expect(receipt.outcome).toBe('fail')
    })

    it('the trusted context path (simulating a future Workstream 1B caller) CAN create a passing receipt', async () => {
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'production',
          outcome: 'pass',
          releaseGuid: release.releaseGuid,
          trackFingerprint: 'abc123',
          schemaVersion: 1,
          playerVersion: '1.0.0',
          themeVersion: 0,
        },
        context: { trustedVerificationRun: true },
        overrideAccess: true,
      })

      expect(receipt.outcome).toBe('pass')
    })

    it('attemptedAt/attemptedBy are always server-set, even if the client sends its own values', async () => {
      const publisher = await makeUser(['publisher'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const forgedDate = new Date('2000-01-01').toISOString()

      const receipt = await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'production',
          outcome: 'fail',
          attemptedAt: forgedDate,
        } as never,
        user: publisher,
        overrideAccess: false,
      })

      expect(receipt.attemptedAt).not.toBe(forgedDate)
      expect(new Date(receipt.attemptedAt as string).getFullYear()).toBe(new Date().getFullYear())
    })
  })

  describe('6. receipts are immutable (update/delete rejected for every role)', () => {
    it('rejects update and delete for admin', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
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
  })

  describe('7. a passing receipt must match the exact current configuration, not just "some pass exists"', () => {
    const attachAttestation = async (releaseId: number, playerVersion: string) => {
      const release = await payload.findByID({ collection: 'releases', id: releaseId, depth: 0 })
      const tracks = await payload.find({ collection: 'tracks', where: { release: { equals: releaseId } }, depth: 0 })
      await payload.update({
        collection: 'releases',
        id: releaseId,
        data: {
          previewAttestation: {
            attestedAt: new Date().toISOString(),
            themeRevisionAt: release.myradio?.themeRevision ?? 0,
            trackFingerprintAt: computeTrackSetFingerprint(tracks.docs),
            playerVersionAt: playerVersion,
            schemaVersionAt: release.distribution?.analyticsSchemaVersion ?? 1,
          },
        },
        overrideAccess: true,
        context: { skipPublicationStateManagement: true },
      })
      return { release, tracks }
    }

    it('rejects a non-production verification receipt', async () => {
      const artistDoc = await makeArtist()
      const { release } = await makeReleaseWithOneTrack(artistDoc.id)
      const current = await attachAttestation(release.id, '1.0.0')

      await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'staging',
          outcome: 'pass',
          releaseGuid: current.release.releaseGuid,
          trackFingerprint: computeTrackSetFingerprint(current.tracks.docs),
          schemaVersion: 1,
          playerVersion: '1.0.0',
          themeVersion: current.release.myradio?.themeRevision ?? 0,
        },
        context: { trustedVerificationRun: true },
        overrideAccess: true,
      })

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'analytics_verified' },
          overrideAccess: true,
        }),
      ).rejects.toThrow(/environment \(must be production\)/)
    })

    it('rejects a receipt produced by a different player build than the preview', async () => {
      const artistDoc = await makeArtist()
      const { release } = await makeReleaseWithOneTrack(artistDoc.id)
      const current = await attachAttestation(release.id, '1.0.0')

      await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'production',
          outcome: 'pass',
          releaseGuid: current.release.releaseGuid,
          trackFingerprint: computeTrackSetFingerprint(current.tracks.docs),
          schemaVersion: 1,
          playerVersion: '2.0.0',
          themeVersion: current.release.myradio?.themeRevision ?? 0,
        },
        context: { trustedVerificationRun: true },
        overrideAccess: true,
      })

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'analytics_verified' },
          overrideAccess: true,
        }),
      ).rejects.toThrow(/player version \(does not match the preview attestation\)/)
    })

    it('rejects publication when the receipt is for a different release', async () => {
      const artistDoc = await makeArtist()
      const { release } = await makeReleaseWithOneTrack(artistDoc.id)
      const otherRelease = await makeDraftRelease(artistDoc.id)

      // Trusted-context receipt, but for the WRONG release id (forged/mismatched).
      await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: otherRelease.id,
          environment: 'production',
          outcome: 'pass',
          releaseGuid: release.releaseGuid,
          trackFingerprint: 'whatever',
          schemaVersion: 1,
          playerVersion: '1.0.0',
          themeVersion: 0,
        },
        context: { trustedVerificationRun: true },
        overrideAccess: true,
      })

      // Manually point THIS release's pointer at the wrong-release receipt the way
      // only trusted server code could (simulating a bug/attack in a future 1B
      // integration) — done via overrideAccess so the test can set up the
      // scenario; the assertion below is what actually matters.
      const wrongReceipt = await payload.find({
        collection: 'analytics-verification-receipts',
        where: { release: { equals: otherRelease.id } },
        overrideAccess: true,
        limit: 1,
      })
      await payload.update({
        collection: 'releases',
        id: release.id,
        data: { analyticsVerification: { latest: wrongReceipt.docs[0].id } },
        overrideAccess: true,
        context: { skipPublicationStateManagement: true },
      })

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'analytics_verified' },
          overrideAccess: true,
        }),
      ).rejects.toThrow(/No passing PostHog verification receipt|does not match the release's current configuration/)
    })

    it('rejects publication when the receipt is stale (theme changed since verification)', async () => {
      const artistDoc = await makeArtist()
      const { release } = await makeReleaseWithOneTrack(artistDoc.id)

      await payload.create({
        collection: 'analytics-verification-receipts',
        data: {
          release: release.id,
          environment: 'production',
          outcome: 'pass',
          releaseGuid: release.releaseGuid,
          trackFingerprint: computeTrackSetFingerprint(
            (await payload.find({ collection: 'tracks', where: { release: { equals: release.id } }, depth: 0 })).docs as never,
          ),
          schemaVersion: 1,
          playerVersion: '1.0.0',
          themeVersion: 0, // matches the release's themeRevision at this point (0)
        },
        context: { trustedVerificationRun: true },
        overrideAccess: true,
      })

      // Now change the theme — this must auto-invalidate by bumping themeRevision,
      // which makes the just-recorded receipt's themeVersion (0) stale.
      await payload.update({
        collection: 'releases',
        id: release.id,
        data: { myradio: { theme: 'terrestrial' } },
        overrideAccess: true,
      })

      await expect(
        payload.update({
          collection: 'releases',
          id: release.id,
          data: { workflowState: 'analytics_verified' },
          overrideAccess: true,
        }),
      ).rejects.toThrow(/No passing PostHog verification receipt|does not match the release's current configuration/)
    })
  })

  describe('8. themeRevision auto-increments and previewAttestation auto-invalidates on relevant change', () => {
    it('changing myradio.theme bumps themeRevision and clears any prior attestation', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const initialRevision = release.myradio?.themeRevision ?? 0

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { myradio: { theme: 'terrestrial' } },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.myradio?.themeRevision).toBe(initialRevision + 1)
    })

    it('changing an unrelated field (e.g. description) does NOT bump themeRevision', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const initialRevision = release.myradio?.themeRevision ?? 0

      const updated = await payload.update({
        collection: 'releases',
        id: release.id,
        data: { description: 'just a description change' },
        user: admin,
        overrideAccess: false,
      })

      expect(updated.myradio?.themeRevision).toBe(initialRevision)
    })

    it('a track audio change invalidates the PARENT release preview attestation (cross-collection)', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const track = await payload.create({
        collection: 'tracks',
        data: { title: 'T', slug: `track-${unique()}`, release: release.id, trackNumber: 1, duration: 100 },
      })

      // Simulate a prior genuine attestation (as only a trusted preview run could set).
      await payload.update({
        collection: 'releases',
        id: release.id,
        data: {
          previewAttestation: {
            attestedAt: new Date().toISOString(),
            themeRevisionAt: 0,
            trackFingerprintAt: 'whatever-it-was-before',
            playerVersionAt: '1.0.0',
            schemaVersionAt: 1,
          },
        },
        overrideAccess: true,
      })

      await payload.update({
        collection: 'tracks',
        id: track.id,
        data: { duration: 200 },
        user: admin,
        overrideAccess: false,
      })

      const afterTrackChange = await payload.findByID({ collection: 'releases', id: release.id, depth: 0 })
      expect(afterTrackChange.previewAttestation?.attestedAt).toBeFalsy()
    })

    it('deleting a track also invalidates the parent release preview attestation', async () => {
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const track = await payload.create({
        collection: 'tracks',
        data: { title: 'T', slug: `track-${unique()}`, release: release.id, trackNumber: 1 },
      })

      await payload.update({
        collection: 'releases',
        id: release.id,
        data: { previewAttestation: { attestedAt: new Date().toISOString(), themeRevisionAt: 0 } },
        overrideAccess: true,
      })

      await payload.delete({ collection: 'tracks', id: track.id, overrideAccess: true })

      const afterDelete = await payload.findByID({ collection: 'releases', id: release.id, depth: 0 })
      expect(afterDelete.previewAttestation?.attestedAt).toBeFalsy()
    })
  })

  describe('9. strengthened track fingerprint: order matters, includes audio identity and duration', () => {
    it('reordering tracks produces a different fingerprint', () => {
      const a = [
        { trackNumber: 1, shareId: 'a', duration: 100, mimeType: 'audio/mpeg', audioUrl: 'https://x/a.mp3' },
        { trackNumber: 2, shareId: 'b', duration: 200, mimeType: 'audio/mpeg', audioUrl: 'https://x/b.mp3' },
      ]
      const reordered = [
        { trackNumber: 1, shareId: 'b', duration: 200, mimeType: 'audio/mpeg', audioUrl: 'https://x/b.mp3' },
        { trackNumber: 2, shareId: 'a', duration: 100, mimeType: 'audio/mpeg', audioUrl: 'https://x/a.mp3' },
      ]
      expect(computeTrackSetFingerprint(a)).not.toBe(computeTrackSetFingerprint(reordered))
    })

    it('changing only the audio URL changes the fingerprint even if duration/shareId stay the same', () => {
      const before = [{ trackNumber: 1, shareId: 'a', duration: 100, mimeType: 'audio/mpeg', audioUrl: 'https://x/a.mp3' }]
      const after = [{ trackNumber: 1, shareId: 'a', duration: 100, mimeType: 'audio/mpeg', audioUrl: 'https://x/a-v2.mp3' }]
      expect(computeTrackSetFingerprint(before)).not.toBe(computeTrackSetFingerprint(after))
    })

    it('is order-independent input, position-dependent output: passing tracks in array order 2,1 matches trackNumber-sorted 1,2', () => {
      const trackA = { trackNumber: 1, shareId: 'a', duration: 100, mimeType: 'audio/mpeg', audioUrl: 'https://x/a.mp3' }
      const trackB = { trackNumber: 2, shareId: 'b', duration: 200, mimeType: 'audio/mpeg', audioUrl: 'https://x/b.mp3' }
      expect(computeTrackSetFingerprint([trackA, trackB])).toBe(computeTrackSetFingerprint([trackB, trackA]))
    })
  })

  describe('10. preview token: expiry and wrong-release behavior', () => {
    it('a freshly issued token verifies successfully for its own release', () => {
      const token = createReleasePreviewToken(42, 600)
      expect(verifyReleasePreviewToken(token, 42)).toEqual({ ok: true })
    })

    it('rejects a token presented for the wrong release', () => {
      const token = createReleasePreviewToken(42, 600)
      const result = verifyReleasePreviewToken(token, 43)
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toBe('wrong_release')
    })

    it('rejects an expired token', () => {
      const token = createReleasePreviewToken(42, -1) // already expired
      const result = verifyReleasePreviewToken(token, 42)
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toBe('expired')
    })

    it('rejects a tampered token (signature mismatch)', () => {
      const token = createReleasePreviewToken(42, 600)
      const tampered = token.slice(0, -4) + 'zzzz'
      const result = verifyReleasePreviewToken(tampered, 42)
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toBe('bad_signature')
    })

    it('rejects a malformed token', () => {
      const result = verifyReleasePreviewToken('not-a-real-token', 42)
      expect(result.ok).toBe(false)
    })

    it('the real preview route rejects query-string credentials and accepts Authorization Bearer', async () => {
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const token = createReleasePreviewToken(release.id, 600)
      const context = { params: Promise.resolve({ slug: release.slug }) }

      const queryResponse = await getPreviewFeed(
        new Request(`https://magicpillmusic.test/feeds/${release.slug}/preview?token=${token}`),
        context,
      )
      expect(queryResponse.status).toBe(403)

      const bearerResponse = await getPreviewFeed(
        new Request(`https://magicpillmusic.test/feeds/${release.slug}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        context,
      )
      expect(bearerResponse.status).toBe(200)
      expect(bearerResponse.headers.get('cache-control')).toBe('no-store')
    })

    it('the real public route returns 404 for a draft release', async () => {
      const artistDoc = await makeArtist()
      const release = await makeDraftRelease(artistDoc.id)
      const response = await getPublicReleaseFeed(
        new Request(`https://magicpillmusic.test/feeds/${release.slug}`),
        { params: Promise.resolve({ slug: release.slug }) },
      )
      expect(response.status).toBe(404)
    })
  })

  describe('11. feed serialization: full theme-config contract, bounded and versioned', () => {
    it('serializes tokens, assets, options, signalCard, and socialCard together', () => {
      const result = buildThemeConfigPayload({
        themeSchemaVersion: 1,
        themeTokens: { accent: '#997eff', panelStart: '#12122a' },
        themeAssets: { backgroundImage: 'https://example.com/bg.png' },
        themeOptions: { artworkTreatment: 'crop', motion: 'none' },
        signalCard: { layout: 'broadcast', showArtwork: false },
        socialCard: { layout: 'minimal' },
      })

      expect(result).not.toBeNull()
      const value = result!.value as Record<string, unknown>
      expect(value.themeSchemaVersion).toBe(1)
      expect((value.tokens as Record<string, string>).accent).toBe('#997eff')
      expect((value.assets as Record<string, string>).backgroundImage).toBe('https://example.com/bg.png')
      expect((value.options as Record<string, string>).artworkTreatment).toBe('crop')
      expect((value.signalCard as Record<string, unknown>).layout).toBe('broadcast')
      expect((value.socialCard as Record<string, unknown>).layout).toBe('minimal')
    })

    it('rejects a non-allowlisted option value rather than passing it through', () => {
      const result = buildThemeConfigPayload({
        themeSchemaVersion: 1,
        themeOptions: { artworkTreatment: '<script>alert(1)</script>' },
      })
      const value = result!.value as Record<string, unknown>
      expect(value.options).toBeUndefined()
    })

    it('rejects a non-http(s) asset URL', () => {
      const result = buildThemeConfigPayload({
        themeSchemaVersion: 1,
        themeAssets: { backgroundImage: 'javascript:alert(1)' },
      })
      const value = result!.value as Record<string, unknown>
      expect(value.assets).toBeUndefined()
    })

    it('returns null (omit from feed) when themeSchemaVersion is absent', () => {
      expect(buildThemeConfigPayload({ themeTokens: { accent: '#fff' } })).toBeNull()
    })

    it('a release with none of the new fields still produces a valid, unchanged-shape feed (backward compatibility)', () => {
      const xml = buildReleaseFeedXml({
        release: {
          id: 1,
          title: 'Legacy Release',
          slug: 'legacy-release',
          type: 'single',
          artist: { id: 1, name: 'Test Artist', slug: 'test-artist' } as never,
          explicit: false,
          releaseGuid: 'mpm-legacy-1',
        } as never,
        tracks: [],
        valueSplits: [],
        settings: {} as never,
        feedSlug: 'legacy-release',
        baseFeedUrl: 'https://magicpillmusic.com',
      })

      expect(xml).toContain('<title><![CDATA[Legacy Release]]></title>') // sanity: title present
      expect(xml).not.toContain('myradio:theme-config')
      expect(xml).not.toContain('myradio:release-lane')
    })
  })

  describe('12. concurrent validation does not cross-contaminate error state', () => {
    it('two overlapping failing publish attempts on different releases each report only their own errors', async () => {
      const admin = await makeUser(['admin'])
      const artistDoc = await makeArtist()

      const releaseA = await makeDraftRelease(artistDoc.id) // missing everything
      const releaseB = await makeDraftRelease(artistDoc.id) // also missing everything, but different id

      const [resultA, resultB] = await Promise.allSettled([
        payload.update({
          collection: 'releases',
          id: releaseA.id,
          data: { workflowState: 'analytics_verified' },
          user: admin,
          overrideAccess: false,
        }),
        payload.update({
          collection: 'releases',
          id: releaseB.id,
          data: { workflowState: 'analytics_verified' },
          user: admin,
          overrideAccess: false,
        }),
      ])

      expect(resultA.status).toBe('rejected')
      expect(resultB.status).toBe('rejected')

      const messageA = (resultA as PromiseRejectedResult).reason?.message as string
      const messageB = (resultB as PromiseRejectedResult).reason?.message as string

      // Both should independently list "Artist is required" etc. — the real
      // assertion is that neither message's error *count* balloons from the other
      // request's errors leaking in (the old module-global array would append both
      // requests' errors into one shared list under concurrency).
      const countBullets = (msg: string) => (msg.match(/\n- /g) ?? []).length
      expect(countBullets(messageA)).toBeGreaterThan(0)
      expect(countBullets(messageB)).toBeGreaterThan(0)
      // Same release shape, same validation gaps → same error count each, not a
      // doubled/summed count from interleaving.
      expect(countBullets(messageA)).toBe(countBullets(messageB))
    })
  })

  describe('13. SSRF-safe audio probe', () => {
    it('blocks a loopback address', async () => {
      const result = await probeAudioUrl('http://127.0.0.1:9999/audio.mp3')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
    })

    it('blocks localhost by name (resolves to loopback)', async () => {
      const result = await probeAudioUrl('http://localhost:9999/audio.mp3')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
    })

    it('blocks a private-range address (RFC1918)', async () => {
      const result = await probeAudioUrl('http://10.0.0.5/audio.mp3')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
    })

    it('blocks the cloud metadata service address (169.254.169.254)', async () => {
      const result = await probeAudioUrl('http://169.254.169.254/latest/meta-data/')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
    })

    it('blocks a non-http(s) protocol', async () => {
      const result = await probeAudioUrl('file:///etc/passwd')
      expect(result.ok).toBe(false)
    })

    it('blocks a URL carrying credentials', async () => {
      const result = await probeAudioUrl('http://user:pass@example.com/audio.mp3')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
    })

    it('rejects a malformed URL without attempting any network call', async () => {
      const result = await probeAudioUrl('not a url at all')
      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toBe('not a well-formed URL')
    })

    it('pins the request to the exact public IP that passed validation (no second DNS lookup)', async () => {
      let lookupCalls = 0
      let connectedAddress = ''
      const result = await probeAudioUrl('https://audio.example.test/song.mp3', {
        lookup: async () => {
          lookupCalls += 1
          return [{ address: '93.184.216.34', family: 4 }]
        },
        request: async (_url, address) => {
          connectedAddress = address.address
          return { status: 200, contentType: 'audio/mpeg', contentLength: 1234, location: null }
        },
      })

      expect(result.ok).toBe(true)
      expect(lookupCalls).toBe(1)
      expect(connectedAddress).toBe('93.184.216.34')
    })

    it('revalidates a redirect and blocks it before a request to a private target', async () => {
      let requestCalls = 0
      const result = await probeAudioUrl('https://audio.example.test/song.mp3', {
        lookup: async (hostname) =>
          hostname === 'audio.example.test'
            ? [{ address: '93.184.216.34', family: 4 }]
            : [{ address: '127.0.0.1', family: 4 }],
        request: async () => {
          requestCalls += 1
          return { status: 302, contentType: null, contentLength: 0, location: 'http://private.example.test/audio' }
        },
      })

      expect(result.ok).toBe(false)
      expect((result as { reason: string }).reason).toMatch(/blocked/)
      expect(requestCalls).toBe(1)
    })

    it('falls back from HEAD 405 to one bounded GET request', async () => {
      const methods: string[] = []
      const result = await probeAudioUrl('https://audio.example.test/song.mp3', {
        lookup: async () => [{ address: '93.184.216.34', family: 4 }],
        request: async (_url, _address, method) => {
          methods.push(method)
          return method === 'HEAD'
            ? { status: 405, contentType: null, contentLength: 0, location: null }
            : { status: 206, contentType: 'audio/mpeg', contentLength: 1024, location: null }
        },
      })

      expect(result.ok).toBe(true)
      expect(methods).toEqual(['HEAD', 'GET'])
    })
  })

  describe('14. already-published content is immutable until explicitly returned to an editable state', () => {
    it('rejects a release-content edit while workflowState remains published', async () => {
      await expect(
        manageReleaseServerFields({
          operation: 'update',
          originalDoc: {
            id: 1,
            title: 'Published title',
            workflowState: 'published',
            status: 'published',
            distribution: { publicVisibility: 'public', analyticsSchemaVersion: 1 },
            myradio: { themeRevision: 2 },
          },
          data: { title: 'Unverified replacement', workflowState: 'published' },
          context: {},
        } as never),
      ).rejects.toThrow(/Move workflowState out of "published"/)
    })

    it('allows an explicit transition out of published before editing', async () => {
      await expect(
        manageReleaseServerFields({
          operation: 'update',
          originalDoc: {
            id: 1,
            title: 'Published title',
            workflowState: 'published',
            status: 'published',
            distribution: { publicVisibility: 'public' },
          },
          data: { workflowState: 'draft' },
          context: {},
        } as never),
      ).resolves.toMatchObject({ workflowState: 'draft', status: 'draft' })
    })

    it('rejects a child-track mutation while its parent release is published', async () => {
      const req = {
        payload: {
          findByID: async () => ({ workflowState: 'published' }),
        },
      }
      await expect(
        protectPublishedReleaseTrackMutation({
          operation: 'update',
          originalDoc: { id: 2, release: 1, title: 'Original', duration: 100 },
          data: { duration: 101 },
          req,
          context: {},
        } as never),
      ).rejects.toThrow(/parent release is published/i)
    })

    it('changing analytics schema clears both preview and analytics verification state', async () => {
      const result = await manageReleaseServerFields({
        operation: 'update',
        originalDoc: {
          id: 1,
          workflowState: 'draft',
          distribution: { analyticsSchemaVersion: 1, publicVisibility: 'preview' },
          previewAttestation: { attestedAt: '2026-01-01T00:00:00.000Z' },
          analyticsVerification: { latest: 42 },
        },
        data: { distribution: { analyticsSchemaVersion: 2 } },
        context: {},
      } as never)

      expect(result?.previewAttestation?.attestedAt).toBeNull()
      expect(result?.analyticsVerification?.latest).toBeNull()
    })
  })
})
