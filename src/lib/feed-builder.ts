import type { Artist, PublishingSetting, Release, Track, ValueSplit } from '../payload-types'

type ReleaseWithFeedFields = Release & {
  medium?: 'music' | 'video' | null
  releaseGuid?: string | null
}

type TrackWithFeedFields = Track & {
  guid?: string | null
}

type ValueSplitWithFeedFields = ValueSplit

type FeedInput = {
  release: ReleaseWithFeedFields
  tracks: TrackWithFeedFields[]
  valueSplits: ValueSplitWithFeedFields[]
  settings: PublishingSetting
  feedSlug: string
  baseFeedUrl: string
}

const xmlAttr = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const xmlText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const toCdata = (value: string): string => `<![CDATA[${value.replaceAll(']]>', ']]&gt;')}]]>`

const toRfc2822 = (value: string | null | undefined): string => {
  if (!value) {
    return new Date().toUTCString()
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString()
  }

  return date.toUTCString()
}

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, '')
  } catch {
    return trimmed.replace(/\/$/, '')
  }
}

const resolveAbsoluteUrl = (value: string | null | undefined, baseUrl: string): string => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  try {
    return new URL(trimmed, baseUrl || undefined).toString()
  } catch {
    return encodeURI(trimmed)
  }
}

const buildPathUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) {
    return encodeURI(path)
  }

  try {
    return new URL(path, `${baseUrl}/`).toString()
  } catch {
    return `${baseUrl}${path}`
  }
}

const isMediaDoc = (value: unknown): value is { url?: string | null } =>
  typeof value === 'object' && value !== null && 'url' in value

const mediaUrl = (media: Release['coverImage'] | Track['artwork'] | PublishingSetting['siteImage'], baseUrl: string): string => {
  if (!isMediaDoc(media)) {
    return ''
  }

  return resolveAbsoluteUrl(media.url, baseUrl)
}

const artistDoc = (artist: Release['artist']): Artist | null => {
  if (!artist || typeof artist === 'number') {
    return null
  }

  return artist
}

const optionalTag = (name: string, value: string): string => (value ? `    <${name}>${xmlText(value)}</${name}>\n` : '')

export const buildReleaseFeedXml = ({
  release,
  tracks,
  valueSplits,
  settings,
  feedSlug,
  baseFeedUrl,
}: FeedInput): string => {
  const normalizedBaseUrl = normalizeBaseUrl(baseFeedUrl)
  const releaseUrl = buildPathUrl(normalizedBaseUrl, `/releases/${encodeURIComponent(feedSlug)}`)
  const selfFeedUrl = buildPathUrl(normalizedBaseUrl, `/feeds/${encodeURIComponent(feedSlug)}`)

  const artist = artistDoc(release.artist)
  const artistName = artist?.name ?? ''
  const artistWebsite = resolveAbsoluteUrl(artist?.website, normalizedBaseUrl)

  const description = release.description ?? settings.podcastDescription ?? ''
  const language = settings.language?.trim() || 'en'
  const medium = release.medium === 'video' ? 'video' : 'music'
  const feedGuid = release.releaseGuid?.trim() || `mpm-${release.type}-${release.id}`
  const coverImageUrl = mediaUrl(release.coverImage, normalizedBaseUrl) || mediaUrl(settings.siteImage, normalizedBaseUrl)
  const copyright = `© ${new Date().getUTCFullYear()} ${artistName}`
  const genre = release.genre ?? settings.defaultCategory ?? ''
  const subgenres = (release.subgenres ?? []).map((entry) => entry.name).filter(Boolean).slice(0, 2)

  const fundingTags = (release.fundingLinks ?? [])
    .filter((entry) => entry.url)
    .map((entry) => {
      const url = resolveAbsoluteUrl(entry.url, normalizedBaseUrl)
      if (!url) {
        return ''
      }

      const label = entry.label || 'Support'
      return `    <podcast:funding url="${xmlAttr(url)}">${xmlText(label)}</podcast:funding>\n`
    })
    .join('')

  const splitTags = valueSplits
    .filter((split) => split.lightningAddress)
    .map(
      (split) =>
        `      <podcast:valueRecipient name="${xmlAttr(split.recipientName || '')}" type="lightning" address="${xmlAttr(split.lightningAddress)}" split="${xmlAttr(String(split.percentage))}" />\n`,
    )
    .join('')

  const channelValueTag = splitTags
    ? `    <podcast:value type="lightning" method="keysend" suggested="${xmlAttr(String(release.suggestedSats ?? settings.defaultSuggestedSats ?? 5000))}">\n${splitTags}    </podcast:value>\n`
    : ''

  const itemTags = tracks
    .map((track) => {
      const trackDescription = track.description ?? description
      const trackGuid = track.guid?.trim() || `mpm-track-${track.id}`
      const pubDate = toRfc2822(release.releaseDate || release.createdAt)

      const audioUrl = resolveAbsoluteUrl(track.audioUrl ?? null, normalizedBaseUrl) || mediaUrl(track.audioFile, normalizedBaseUrl)
      const videoUrl = resolveAbsoluteUrl(track.videoUrl ?? null, normalizedBaseUrl)

      const hasAudio = Boolean(audioUrl)
      const hasVideo = Boolean(videoUrl)

      if (!hasAudio && !hasVideo) {
        return ''
      }

      const audioMimeType = track.mimeType?.trim() || 'audio/mpeg'
      const videoMimeType = track.videoMimeType?.trim() || 'video/mp4'
      const audioLength = String(track.fileSize ?? 0)
      const videoLength = String(track.videoFileSize ?? 0)

      const primaryUrl = medium === 'video' ? videoUrl || audioUrl : audioUrl || videoUrl
      const primaryType = medium === 'video' ? (hasVideo ? videoMimeType : audioMimeType) : hasAudio ? audioMimeType : videoMimeType
      const primaryLength = medium === 'video' ? (hasVideo ? videoLength : audioLength) : hasAudio ? audioLength : videoLength

      const alternateTag =
        hasAudio && hasVideo
          ? medium === 'video'
            ? `      <podcast:alternateEnclosure type="${xmlAttr(audioMimeType)}" length="${xmlAttr(audioLength)}">\n        <podcast:source url="${xmlAttr(audioUrl)}" />\n      </podcast:alternateEnclosure>\n`
            : `      <podcast:alternateEnclosure type="${xmlAttr(videoMimeType)}" length="${xmlAttr(videoLength)}">\n        <podcast:source url="${xmlAttr(videoUrl)}" />\n      </podcast:alternateEnclosure>\n`
          : ''

      const itemArtwork = mediaUrl(track.artwork, normalizedBaseUrl) || coverImageUrl
      const transcriptUrl = resolveAbsoluteUrl(track.transcriptUrl, normalizedBaseUrl)

      return (
        '    <item>\n' +
        `      <title>${toCdata(track.title)}</title>\n` +
        `      <description>${toCdata(trackDescription)}</description>\n` +
        `      <guid isPermaLink="false">${xmlText(trackGuid)}</guid>\n` +
        `      <podcast:guid>${xmlText(trackGuid)}</podcast:guid>\n` +
        `      <pubDate>${xmlText(pubDate)}</pubDate>\n` +
        `      <enclosure url="${xmlAttr(primaryUrl)}" length="${xmlAttr(primaryLength)}" type="${xmlAttr(primaryType)}" />\n` +
        alternateTag +
        `      <itunes:explicit>${track.explicit ? 'true' : 'false'}</itunes:explicit>\n` +
        `      <itunes:author>${toCdata(artistName)}</itunes:author>\n` +
        `      <itunes:summary>${toCdata(trackDescription)}</itunes:summary>\n` +
        `      <podcast:episode>${xmlText(String(track.trackNumber))}</podcast:episode>\n` +
        (itemArtwork ? `      <itunes:image href="${xmlAttr(itemArtwork)}" />\n` : '') +
        (transcriptUrl
          ? `      <podcast:transcript type="text/vtt" url="${xmlAttr(transcriptUrl)}" rel="lyrics" />\n`
          : '') +
        (track.isrc ? `      <podcast:txt purpose="isrc">${xmlText(track.isrc)}</podcast:txt>\n` : '') +
        '    </item>\n'
      )
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"\n' +
    '     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"\n' +
    '     xmlns:podcast="https://podcastindex.org/namespace/1.0"\n' +
    '     xmlns:dc="http://purl.org/dc/elements/1.1/"\n' +
    '     xmlns:content="http://purl.org/rss/1.0/modules/content/"\n' +
    '     xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    `    <title>${toCdata(release.title)}</title>\n` +
    `    <link>${xmlText(releaseUrl)}</link>\n` +
    `    <description>${toCdata(description)}</description>\n` +
    `    <language>${xmlText(language)}</language>\n` +
    `    <lastBuildDate>${xmlText(toRfc2822(new Date().toISOString()))}</lastBuildDate>\n` +
    `    <atom:link href="${xmlAttr(selfFeedUrl)}" rel="self" type="application/rss+xml" />\n` +
    `    <itunes:author>${toCdata(artistName)}</itunes:author>\n` +
    `    <itunes:explicit>${release.explicit ? 'true' : 'false'}</itunes:explicit>\n` +
    `    <itunes:summary>${toCdata(description)}</itunes:summary>\n` +
    '    <itunes:type>episodic</itunes:type>\n' +
    (genre
      ? `    <itunes:category text="${xmlAttr(genre)}">\n${subgenres
          .map((subgenre) => `      <itunes:category text="${xmlAttr(subgenre)}" />\n`)
          .join('')}    </itunes:category>\n`
      : '') +
    `    <copyright>${toCdata(copyright)}</copyright>\n` +
    `    <podcast:guid>${xmlText(feedGuid)}</podcast:guid>\n` +
    `    <podcast:medium>${xmlText(medium)}</podcast:medium>\n` +
    `    <podcast:locked>${release.feedLocked ? 'yes' : 'no'}</podcast:locked>\n` +
    optionalTag('podcast:license', release.license ?? '') +
    optionalTag('podcast:location', release.location ?? '') +
    (release.socialUrl
      ? `    <podcast:socialInteract platform="nostr" url="${xmlAttr(resolveAbsoluteUrl(release.socialUrl, normalizedBaseUrl))}" />\n`
      : '') +
    (release.upc ? `    <podcast:txt purpose="upc">${xmlText(release.upc)}</podcast:txt>\n` : '') +
    (coverImageUrl ? `    <itunes:image href="${xmlAttr(coverImageUrl)}" />\n` : '') +
    (coverImageUrl ? `    <podcast:image href="${xmlAttr(coverImageUrl)}" />\n` : '') +
    (coverImageUrl
      ? '    <image>\n' +
        `      <url>${xmlText(coverImageUrl)}</url>\n` +
        `      <title>${xmlText(release.title)}</title>\n` +
        `      <link>${xmlText(releaseUrl)}</link>\n` +
        '    </image>\n'
      : '') +
    (artistName
      ? `    <podcast:person role="artist" href="${xmlAttr(artistWebsite)}">${xmlText(artistName)}</podcast:person>\n`
      : '') +
    fundingTags +
    channelValueTag +
    itemTags +
    '  </channel>\n' +
    '</rss>\n'
  )
}
