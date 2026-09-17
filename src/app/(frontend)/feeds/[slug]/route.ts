import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildReleaseFeedXml } from '../../../../lib/feed-builder'
import { getServerSideURL } from '../../../../utilities/getURL'
import { feedResponseHeaders } from '../headers'

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

export const GET = async (_request: Request, context: RouteContext) => {
  const { slug } = await context.params

  const payload = await getPayload({
    config: configPromise,
  })

  const releaseResult = await payload.find({
    collection: 'releases',
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: 'published' } },
        // `distribution.publicVisibility` is new (ND-MR-001) and optional — a
        // release saved before this field existed has no value for it and must
        // keep resolving exactly as it did before. Only an explicit "archived"
        // or "preview" value removes a release from this public route.
        {
          or: [
            { 'distribution.publicVisibility': { equals: 'public' } },
            { 'distribution.publicVisibility': { exists: false } },
          ],
        },
      ],
    },
    depth: 2,
    limit: 1,
  })

  const release = releaseResult.docs[0]

  if (!release) {
    return new Response('Not Found', {
      status: 404,
      headers: { ...feedResponseHeaders, 'Content-Type': 'text/plain; charset=UTF-8' },
    })
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

  // NOTE: never derive this from request.url — nginx proxies to 127.0.0.1:3000, so the
  // request origin is the internal host, not the public one.
  const baseFeedUrl = settings.baseFeedUrl?.trim() || getServerSideURL()

  const xml = buildReleaseFeedXml({
    release,
    tracks: tracksResult.docs,
    valueSplits: valueSplitsResult.docs,
    settings,
    feedSlug: slug,
    baseFeedUrl,
  })

  return new Response(xml, {
    headers: feedResponseHeaders,
  })
}

export const OPTIONS = () => new Response(null, { status: 204, headers: feedResponseHeaders })
