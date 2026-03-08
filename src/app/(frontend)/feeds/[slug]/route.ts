import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildReleaseFeedXml } from '../../../../lib/feed-builder'

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

export const GET = async (request: Request, context: RouteContext) => {
  const { slug } = await context.params

  const payload = await getPayload({
    config: configPromise,
  })

  const releaseResult = await payload.find({
    collection: 'releases',
    where: {
      slug: {
        equals: slug,
      },
      status: {
        equals: 'published',
      },
    },
    depth: 2,
    limit: 1,
  })

  const release = releaseResult.docs[0]

  if (!release) {
    return new Response('Not Found', { status: 404 })
  }

  const [tracksResult, valueSplitsResult, settings] = await Promise.all([
    payload.find({
      collection: 'tracks',
      where: {
        release: {
          equals: release.id,
        },
      },
      sort: 'trackNumber',
      depth: 1,
      limit: 100,
    }),
    payload.find({
      collection: 'value-splits',
      where: {
        release: {
          equals: release.id,
        },
      },
      limit: 100,
    }),
    payload.findGlobal({
      slug: 'publishing-settings',
      depth: 1,
    }),
  ])

  const baseFeedUrl = settings.baseFeedUrl?.trim() || new URL(request.url).origin

  const xml = buildReleaseFeedXml({
    release,
    tracks: tracksResult.docs,
    valueSplits: valueSplitsResult.docs,
    settings,
    feedSlug: slug,
    baseFeedUrl,
  })

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
    },
  })
}
