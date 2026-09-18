export const REQUIRED_ANALYTICS_EVENTS = [
  'shadow_audio_post_viewed',
  'my_radio_embed_impression',
  'my_radio_embed_ready',
  'my_radio_track_started',
  'my_radio_track_qualified_play',
  'my_radio_track_paused',
  'my_radio_track_resumed',
  'my_radio_track_completed',
  'my_radio_share_target_clicked',
  'my_radio_continue_clicked',
  'my_radio_playlist_viewed',
  'shadow_membership_intent',
] as const

type QueryRow = [
  event: string,
  timestamp: string,
  distinctId: string,
  eventId: string,
  playerVersion: string,
  schemaVersion: string,
  canonical: string,
  surfaceContext: string,
]

type QueryResponse = { columns?: string[]; results?: QueryRow[] }

export type VerificationResult = {
  outcome: 'pass' | 'fail'
  sampleEventIds: string[]
  playerVersion: string
  notes: string
  missingEvents: string[]
}

function hogqlString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").slice(0, 200)}'`
}

function validConfig(value: string | undefined): value is string {
  return Boolean(value && value.trim())
}

export async function verifyPostHogJourney({
  campaignId,
  releaseSlug,
  expectedPlayerVersion,
  fetchImpl = fetch,
  host = process.env.POSTHOG_HOST || 'https://us.posthog.com',
  projectId = process.env.POSTHOG_PROJECT_ID,
  personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY,
}: {
  campaignId: string
  releaseSlug: string
  expectedPlayerVersion?: string
  fetchImpl?: typeof fetch
  host?: string
  projectId?: string
  personalApiKey?: string
}): Promise<VerificationResult> {
  if (!validConfig(projectId) || !validConfig(personalApiKey)) {
    return {
      outcome: 'fail',
      sampleEventIds: [],
      playerVersion: '',
      missingEvents: [...REQUIRED_ANALYTICS_EVENTS],
      notes: 'PostHog verification is not configured on the DEMU server.',
    }
  }

  const eventList = REQUIRED_ANALYTICS_EVENTS.map(hogqlString).join(', ')
  const query = `
    SELECT
      event,
      timestamp,
      distinct_id,
      toString(properties.event_id),
      toString(properties.player_version),
      toString(properties.schema_version),
      toString(properties.is_canonical_host),
      toString(properties.surface_context)
    FROM events
    WHERE timestamp >= now() - INTERVAL 6 HOUR
      AND event IN (${eventList})
      AND properties.environment = 'production'
      AND coalesce(toString(properties.test), 'false') != 'true'
      AND properties.campaign_id = ${hogqlString(campaignId)}
      AND (properties.release_slug = ${hogqlString(releaseSlug)} OR event IN ('shadow_audio_post_viewed', 'shadow_membership_intent'))
    ORDER BY timestamp ASC
    LIMIT 500
  `

  let response: Response
  try {
    response = await fetchImpl(`${host.replace(/\/$/, '')}/api/projects/${encodeURIComponent(projectId)}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name: 'DEMU Signal Publishing gate v1' }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return {
      outcome: 'fail',
      sampleEventIds: [],
      playerVersion: '',
      missingEvents: [...REQUIRED_ANALYTICS_EVENTS],
      notes: 'PostHog query failed or timed out. Playback remains unaffected.',
    }
  }

  if (!response.ok) {
    return {
      outcome: 'fail',
      sampleEventIds: [],
      playerVersion: '',
      missingEvents: [...REQUIRED_ANALYTICS_EVENTS],
      notes: `PostHog query returned HTTP ${response.status}.`,
    }
  }

  const payload = (await response.json()) as QueryResponse
  const rows = Array.isArray(payload.results) ? payload.results : []
  const byListener = new Map<string, QueryRow[]>()
  for (const row of rows) {
    if (!Array.isArray(row) || !row[2]) continue
    byListener.set(row[2], [...(byListener.get(row[2]) || []), row])
  }

  let bestRows: QueryRow[] = []
  for (const listenerRows of byListener.values()) {
    const unique = new Set(listenerRows.map((row) => row[0]))
    const bestUnique = new Set(bestRows.map((row) => row[0]))
    if (unique.size > bestUnique.size) bestRows = listenerRows
  }

  const seen = new Set(bestRows.map((row) => row[0]))
  const missingEvents = REQUIRED_ANALYTICS_EVENTS.filter((event) => !seen.has(event))
  const invalidRows = bestRows.filter((row) => !row[3] || row[5] !== '1' || row[6] !== 'true')
  const embedRows = bestRows.filter((row) => row[0].startsWith('my_radio_') && row[7] === 'shadow_signal_card')
  const playerVersions = [...new Set(bestRows.map((row) => row[4]).filter(Boolean))]
  const playerVersion = playerVersions[0] || ''
  const versionMismatch = Boolean(expectedPlayerVersion && playerVersion !== expectedPlayerVersion)
  const inconsistentPlayerVersion = playerVersions.length > 1
  const startedAt = bestRows.findIndex((row) => row[0] === 'my_radio_track_started')
  const qualifiedAt = bestRows.findIndex((row) => row[0] === 'my_radio_track_qualified_play')
  const completedAt = bestRows.findIndex((row) => row[0] === 'my_radio_track_completed')
  const orderValid = startedAt >= 0 && qualifiedAt > startedAt && completedAt > qualifiedAt
  const passed = missingEvents.length === 0
    && invalidRows.length === 0
    && embedRows.length > 0
    && !versionMismatch
    && !inconsistentPlayerVersion
    && orderValid

  const reasons = [
    missingEvents.length ? `missing events: ${missingEvents.join(', ')}` : '',
    invalidRows.length ? `${invalidRows.length} event(s) failed ID/schema/canonical checks` : '',
    embedRows.length === 0 ? 'no MYRADIO event carried surface_context=shadow_signal_card' : '',
    versionMismatch ? 'player version did not match the current preview attestation' : '',
    inconsistentPlayerVersion ? 'events contained more than one player version' : '',
    !orderValid ? 'start → qualified → complete ordering was not valid' : '',
  ].filter(Boolean)

  return {
    outcome: passed ? 'pass' : 'fail',
    sampleEventIds: bestRows.map((row) => row[3]).filter(Boolean).slice(0, 50),
    playerVersion,
    missingEvents,
    notes: passed ? 'Production Signal Publishing journey verified.' : reasons.join('; '),
  }
}
