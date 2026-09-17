import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildReleaseFeedXml } from '../../../../../lib/feed-builder'
import { verifyReleasePreviewToken } from '../../../../../lib/previewToken'
import { getServerSideURL } from '../../../../../utilities/getURL'
import { feedPreviewResponseHeaders } from '../../headers'

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

/**
 * Draft-visible release feed, gated by a scoped expiring token (src/lib/
 * previewToken.ts) instead of publication status. This is what EO §7.7 calls "an
 * authenticated or signed, short-lived preview path for draft validation" — it lets
 * a release be previewed in MYRADIO before it ever enters the public publisher feed,
 * without needing to make the release public just to test it.
 *
 * The token itself never grants access to the Payload Admin API — this route only
 * ever returns the same feed XML shape the public route returns, for one release, for
 * a limited time.
 */
export const GET = async (request: Request, context: RouteContext) => {
  const { slug } = await context.params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  const payload = await getPayload({ config: configPromise })

  const releaseResult = await payload.find({
    collection: 'releases',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
    draft: true,
  })

  const release = releaseResult.docs[0]

  if (!release) {
    return new Response('Not Found', {
      status: 404,
      headers: { ...feedPreviewResponseHeaders, 'Content-Type': 'text/plain; charset=UTF-8' },
    })
  }

  const verification = verifyReleasePreviewToken(token, release.id)
  if (!verification.ok) {
    return new Response('Invalid or expired preview token', {
      status: 403,
      headers: { ...feedPreviewResponseHeaders, 'Content-Type': 'text/plain; charset=UTF-8' },
    })
  }

  const [tracksResult, valueSplitsResult, settings] = await Promise.all([
    payload.find({
      collection: 'tracks',
      where: { release: { equals: release.id } },
      sort: 'trackNumber',
      depth: 1,
      limit: 100,
      draft: true,
    }),
    payload.find({
      collection: 'value-splits',
      where: { release: { equals: release.id } },
      limit: 100,
    }),
    payload.findGlobal({ slug: 'publishing-settings', depth: 1 }),
  ])

  const baseFeedUrl = settings.baseFeedUrl?.trim() || getServerSideURL()

  const xml = buildReleaseFeedXml({
    release,
    tracks: tracksResult.docs,
    valueSplits: valueSplitsResult.docs,
    settings,
    feedSlug: slug,
    baseFeedUrl,
  })

  return new Response(xml, { headers: feedPreviewResponseHeaders })
}

export const OPTIONS = () => new Response(null, { status: 204, headers: feedPreviewResponseHeaders })
