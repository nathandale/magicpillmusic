import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildPublisherFeedXml } from '../../../../lib/feed-builder'
import { getServerSideURL } from '../../../../utilities/getURL'
import { feedResponseHeaders } from '../headers'

/**
 * Podcasting 2.0 `medium=publisher` feed.
 *
 * Lists every published release as a <podcast:remoteItem>, so a client can fetch
 * this single URL and discover the whole catalogue without being told each slug.
 *
 * Note: this static segment takes precedence over /feeds/[slug], so a release may
 * not use the slug "publisher".
 */
export const GET = async () => {
  const payload = await getPayload({
    config: configPromise,
  })

  const [releasesResult, settings] = await Promise.all([
    payload.find({
      collection: 'releases',
      // See src/app/(frontend)/feeds/[slug]/route.ts for the reasoning — all four
      // conditions must hold for a release to appear in the public feed.
      where: {
        and: [
          { _status: { equals: 'published' } },
          { workflowState: { equals: 'published' } },
          { status: { equals: 'published' } },
          { 'distribution.publicVisibility': { equals: 'public' } },
        ],
      },
      sort: ['myradio.order', '-releaseDate'],
      depth: 0,
      limit: 500,
    }),
    payload.findGlobal({
      slug: 'publishing-settings',
      depth: 1,
    }),
  ])

  // NOTE: never derive this from request.url — nginx proxies to 127.0.0.1:3000, so the
  // request origin is the internal host, not the public one.
  const baseFeedUrl = settings.baseFeedUrl?.trim() || getServerSideURL()

  const xml = buildPublisherFeedXml({
    releases: releasesResult.docs,
    settings,
    baseFeedUrl,
  })

  return new Response(xml, {
    headers: feedResponseHeaders,
  })
}

export const OPTIONS = () => new Response(null, { status: 204, headers: feedResponseHeaders })
