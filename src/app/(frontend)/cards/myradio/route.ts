import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { cardImageResponse, findSiteCard, renderCached } from '@/lib/share-card/load'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public link-preview image for myradio.nathandale.com itself (MY RADIO global). */
export const GET = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { body, version } = await renderCached(await findSiteCard(payload))
  return cardImageResponse(body, version, new URL(request.url).searchParams.get('v'))
}
