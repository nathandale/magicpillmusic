import { describe, expect, it, vi } from 'vitest'

import { REQUIRED_ANALYTICS_EVENTS, verifyPostHogJourney } from '@/lib/posthogVerification'

const makeResponse = (results: unknown[], ok = true, status = 200) => ({
  ok,
  status,
  json: async () => ({ results }),
}) as Response

const completeJourney = (overrides: Partial<Record<number, unknown>> = {}) =>
  REQUIRED_ANALYTICS_EVENTS.map((event, index) => {
    const row: unknown[] = [
      event,
      `2026-09-18T00:${String(index).padStart(2, '0')}:00Z`,
      'listener-1',
      `event-${index}`,
      '2.4.0',
      '1',
      'true',
      event.startsWith('my_radio_') ? 'shadow_signal_card' : 'shadow_audio_post',
    ]
    for (const [position, value] of Object.entries(overrides)) row[Number(position)] = value
    return row
  })

describe('Workstream 4: PostHog journey verification', () => {
  it('passes one complete, canonical, version-matched listener journey', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => makeResponse(completeJourney()))
    const fetchImpl = fetchMock as unknown as typeof fetch
    const result = await verifyPostHogJourney({
      campaignId: 'campaign-1',
      releaseSlug: 'my-radio',
      expectedPlayerVersion: '2.4.0',
      projectId: 'project-1',
      personalApiKey: 'server-only-key',
      fetchImpl,
    })

    expect(result.outcome).toBe('pass')
    expect(result.sampleEventIds).toHaveLength(REQUIRED_ANALYTICS_EVENTS.length)
    const [, request] = fetchMock.mock.calls[0]
    const requestBody = JSON.parse(String(request?.body))
    expect(requestBody.query.query).toContain("properties.environment = 'production'")
    expect(requestBody.query.query).toContain("properties.campaign_id = 'campaign-1'")
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer server-only-key' })
  })

  it('fails closed when a required event is missing', async () => {
    const rows = completeJourney().filter((row) => row[0] !== 'my_radio_track_completed')
    const result = await verifyPostHogJourney({
      campaignId: 'campaign-1',
      releaseSlug: 'my-radio',
      projectId: 'project-1',
      personalApiKey: 'server-only-key',
      fetchImpl: vi.fn(async () => makeResponse(rows)) as unknown as typeof fetch,
    })

    expect(result.outcome).toBe('fail')
    expect(result.missingEvents).toContain('my_radio_track_completed')
  })

  it('fails closed for invalid schema, canonical host, ordering, or player version', async () => {
    const rows = completeJourney()
    rows[0][5] = '2'
    rows[1][6] = 'false'
    const completedIndex = rows.findIndex((row) => row[0] === 'my_radio_track_completed')
    const startedIndex = rows.findIndex((row) => row[0] === 'my_radio_track_started')
    if (completedIndex >= 0 && startedIndex >= 0) {
      [rows[completedIndex], rows[startedIndex]] = [rows[startedIndex], rows[completedIndex]]
    }

    const result = await verifyPostHogJourney({
      campaignId: 'campaign-1',
      releaseSlug: 'my-radio',
      expectedPlayerVersion: '9.9.9',
      projectId: 'project-1',
      personalApiKey: 'server-only-key',
      fetchImpl: vi.fn(async () => makeResponse(rows)) as unknown as typeof fetch,
    })

    expect(result.outcome).toBe('fail')
    expect(result.notes).toContain('schema/canonical')
    expect(result.notes).toContain('player version')
    expect(result.notes).toContain('ordering')
  })

  it('fails closed when server credentials are absent or PostHog is unavailable', async () => {
    const unconfigured = await verifyPostHogJourney({
      campaignId: 'campaign-1',
      releaseSlug: 'my-radio',
      projectId: '',
      personalApiKey: '',
    })
    expect(unconfigured.outcome).toBe('fail')
    expect(unconfigured.notes).toContain('not configured')

    const unavailable = await verifyPostHogJourney({
      campaignId: 'campaign-1',
      releaseSlug: 'my-radio',
      projectId: 'project-1',
      personalApiKey: 'server-only-key',
      fetchImpl: vi.fn(async () => makeResponse([], false, 503)) as unknown as typeof fetch,
    })
    expect(unavailable.outcome).toBe('fail')
    expect(unavailable.notes).toContain('HTTP 503')
  })
})
