/**
 * Shared response headers for the public feed routes.
 *
 * Feeds are public XML documents intended to be consumed by any Podcasting 2.0
 * client — MY RADIO at myradio.nathandale.com, Fountain, Podverse, aggregators.
 * Those are browser and server clients on arbitrary origins, so the feeds are
 * served with an open CORS policy. Nothing here is private: the same bytes are
 * returned to an anonymous curl.
 */
export const feedResponseHeaders: Record<string, string> = {
  'Content-Type': 'application/rss+xml; charset=UTF-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Short cache: keeps the feed fast for listeners while letting publisher edits
  // (titles, credits, order…) appear within ~15s instead of a couple of minutes.
  'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
}
