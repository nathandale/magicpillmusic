import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { findSiteCard } from '@/lib/share-card/load'
import { shareCardVersion } from '@/lib/share-card/resolve'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'

/**
 * Link-preview metadata for myradio.nathandale.com's own homepage, read by the
 * MY RADIO metadata service. Public: it only exposes what the card already shows.
 */
export const GET = async () => {
  const payload = await getPayload({ config: configPromise })
  const card = await findSiteCard(payload)
  const body = {
    title: card.linkTitle,
    description: card.linkDescription,
    image: `${getServerSideURL()}/cards/myradio?v=${shareCardVersion(card)}`,
    imageAlt: 'MY RADIO share card',
  }
  return Response.json(body, {
    headers: { 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' },
  })
}
