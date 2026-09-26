import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { SHARE_ID_PATTERN, cardImageResponse, findPublicTrackCard, renderCached } from '@/lib/share-card/load'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ shareId: string }> }

/** Public 1200×630 link-preview image for one published track. */
export const GET = async (request: Request, context: RouteContext) => {
  const { shareId } = await context.params
  if (!SHARE_ID_PATTERN.test(shareId)) return new Response('Not Found', { status: 404 })
  const payload = await getPayload({ config: configPromise })
  const card = await findPublicTrackCard(payload, shareId)
  if (!card) return new Response('Not Found', { status: 404 })
  const { body, version } = await renderCached(card)
  return cardImageResponse(body, version, new URL(request.url).searchParams.get('v'))
}
