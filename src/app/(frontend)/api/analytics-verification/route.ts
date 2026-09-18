import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import config from '@payload-config'
import type { Release, User } from '@/payload-types'
import { isPublisher } from '@/access/roles'
import { verifyPostHogJourney } from '@/lib/posthogVerification'
import { computeTrackSetFingerprint } from '@/lib/trackFingerprint'

export const maxDuration = 30

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    const { user } = await payload.auth({ headers: requestHeaders })
    if (!isPublisher(user as User | null)) return Response.json({ error: 'Forbidden.' }, { status: 403 })

    let releaseId: number
    try {
      const body = (await request.json()) as { releaseId?: string | number }
      if (!body.releaseId) throw new Error('missing')
      releaseId = Number(body.releaseId)
      if (!Number.isInteger(releaseId) || releaseId <= 0) throw new Error('invalid')
    } catch {
      return Response.json({ error: 'A release ID is required.' }, { status: 400 })
    }

    const req = await createLocalReq({ user: user || undefined }, payload)
    const release = (await payload.findByID({
      collection: 'releases',
      id: releaseId,
      depth: 0,
      req,
      overrideAccess: false,
    })) as Release
    const tracks = await payload.find({
      collection: 'tracks',
      where: { release: { equals: releaseId } },
      sort: 'trackNumber',
      limit: 200,
      depth: 0,
      req,
      overrideAccess: false,
    })

    const campaignId = release.distribution?.campaignKey || ''
    const releaseSlug = release.slug || ''
    if (!campaignId || !releaseSlug || !release.releaseGuid) {
      return Response.json({ error: 'Release GUID, slug, and campaign key are required before verification.' }, { status: 400 })
    }

    const expectedPlayerVersion = release.previewAttestation?.playerVersionAt || ''
    const result = await verifyPostHogJourney({ campaignId, releaseSlug, expectedPlayerVersion })

    // Intentional server authority: the authenticated route has already enforced
    // publisher/admin access and the verifier—not the browser—computed the outcome.
    const receipt = await payload.create({
      collection: 'analytics-verification-receipts',
      data: {
        release: releaseId,
        environment: 'production',
        outcome: result.outcome,
        releaseGuid: release.releaseGuid,
        trackFingerprint: computeTrackSetFingerprint(tracks.docs),
        schemaVersion: release.distribution?.analyticsSchemaVersion || 1,
        playerVersion: result.playerVersion || expectedPlayerVersion,
        themeVersion: release.myradio?.themeRevision || 0,
        sampleEventIds: result.sampleEventIds.map((eventId) => ({ eventId })),
        notes: result.notes,
      },
      req,
      overrideAccess: true,
      context: { trustedVerificationRun: true },
      depth: 0,
    })

    return Response.json({
      outcome: result.outcome,
      receiptId: receipt.id,
      missingEvents: result.missingEvents,
      notes: result.notes,
    }, { status: result.outcome === 'pass' ? 200 : 422 })
  } catch (error) {
    console.error('Analytics verification failed', error)
    return Response.json({ error: 'Analytics verification could not be completed.' }, { status: 500 })
  }
}
