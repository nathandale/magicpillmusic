import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { populateDesignMedia, renderCached, resolveCardForTrack } from '@/lib/share-card/load'
import { type ShareCardDesign, resolveSiteShareCard } from '@/lib/share-card/resolve'
import type { Release, Track } from '@/payload-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const decodeDesign = (value: string | null): ShareCardDesign | null => {
  if (!value || value.length > 8000) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ShareCardDesign) : null
  } catch {
    return null
  }
}

/**
 * Live preview for the admin Share card panels. Renders UNSAVED form values
 * (`d`, base64url JSON) against the saved document, so it is staff-only.
 */
export const GET = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getHeaders() })
  if (!user) return new Response('Unauthorized', { status: 401 })

  const params = new URL(request.url).searchParams
  const kind = params.get('kind')
  const id = params.get('id')
  const design = await populateDesignMedia(payload, decodeDesign(params.get('d')))

  let card
  if (kind === 'site') {
    card = resolveSiteShareCard(design)
  } else if (kind === 'release' && id) {
    const release = (await payload.findByID({ collection: 'releases', id, depth: 1, draft: true }).catch(() => null)) as Release | null
    if (!release) return new Response('Not Found', { status: 404 })
    // A release card is previewed on one of its songs: the requested one, else the first.
    const sampleId = params.get('track')
    const { docs } = await payload.find({
      collection: 'tracks',
      where: sampleId ? { and: [{ release: { equals: release.id } }, { id: { equals: sampleId } }] } : { release: { equals: release.id } },
      sort: 'trackNumber',
      depth: 1,
      limit: 1,
      draft: true,
    })
    const track = (docs[0] ?? { title: release.title }) as Track
    card = resolveCardForTrack(release, track, { useReleaseDefault: true }, design)
  } else if (kind === 'track' && id) {
    const track = (await payload.findByID({ collection: 'tracks', id, depth: 1, draft: true }).catch(() => null)) as Track | null
    const releaseId = typeof track?.release === 'object' ? track.release?.id : track?.release
    if (!track || !releaseId) return new Response('Not Found', { status: 404 })
    const release = (await payload.findByID({ collection: 'releases', id: releaseId, depth: 1, draft: true }).catch(() => null)) as Release | null
    if (!release) return new Response('Not Found', { status: 404 })
    card = resolveCardForTrack(release, track, design)
  } else {
    return new Response('Bad Request', { status: 400 })
  }

  const { body } = await renderCached(card)
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
