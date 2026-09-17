'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

type TrackRow = {
  id: string | number
  title: string
  shareId: string | null
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 6,
  padding: 16,
  marginTop: 8,
  marginBottom: 16,
  maxWidth: 720,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '6px 0',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

const disabledButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '0.75rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-50)',
  color: 'var(--theme-elevation-400)',
  cursor: 'not-allowed',
}

const copyButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '0.75rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-250)',
  background: 'var(--theme-elevation-0)',
  cursor: 'pointer',
}

/**
 * "SHADOW & Campaign" panel (EO §7.9). Workstream 1A ships the parts that need only
 * DEMU's own data: the computed story/listen URLs, the SHADOW marker generator (pure
 * client-side templating — no network call), and an honest, disabled state for the
 * two actions that genuinely cannot work yet ("Run player preview", "Verify
 * analytics") because they depend on MYRADIO/PostHog infrastructure that doesn't
 * exist until Workstream 1B. Those buttons are disabled and say so — they do not
 * pretend to succeed.
 */
export const ShadowCampaignPanel: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const apiRoute = config.routes.api || '/api'

  const slug = useFormFields(([fields]) => fields.slug?.value as string | undefined)
  const shadowPostSlug = useFormFields(
    ([fields]) => fields['distribution.shadowPostSlug']?.value as string | undefined,
  )
  const workflowState = useFormFields(([fields]) => fields.workflowState?.value as string | undefined)
  const previewAttestedAt = useFormFields(
    ([fields]) => fields['previewAttestation.attestedAt']?.value as string | undefined,
  )
  const analyticsVerifiedAt = useFormFields(
    ([fields]) => fields['analyticsVerification.summary.verifiedAt']?.value as string | undefined,
  )

  const [tracks, setTracks] = useState<TrackRow[]>([])
  const [copiedId, setCopiedId] = useState<string | number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`${apiRoute}/tracks?limit=100&depth=0&where[release][equals]=${id}&sort=trackNumber`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((json: { docs?: Record<string, unknown>[] }) => {
        if (cancelled) return
        setTracks(
          (json.docs ?? []).map((doc) => ({
            id: doc.id as string | number,
            title: (doc.title as string) || 'Untitled',
            shareId: (doc.shareId as string) || null,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setTracks([])
      })
    return () => {
      cancelled = true
    }
  }, [id, apiRoute])

  const storyUrl = shadowPostSlug ? `https://nathandale.com/shadow/${shadowPostSlug}/` : null
  const listenUrl = slug ? `https://myradio.nathandale.com/playlist/${slug}` : null

  const copyMarker = useCallback(
    (track: TrackRow) => {
      if (!slug || !track.shareId) return
      const marker =
        `<div class="nd-signal-card"\n` +
        `     data-release="${slug}"\n` +
        `     data-track="${track.shareId}"${shadowPostSlug ? `\n     data-story-slug="${shadowPostSlug}"` : ''}>\n` +
        `</div>`
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(marker).then(() => {
          setCopiedId(track.id)
          setTimeout(() => setCopiedId(null), 2000)
        })
      }
    },
    [slug, shadowPostSlug],
  )

  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: '0.9375rem' }}>SHADOW &amp; Campaign</h3>
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.8125rem', marginBottom: 12 }}>
        Workflow state: <strong>{workflowState || 'draft'}</strong>
      </p>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.8125rem', marginBottom: 2 }}>
          Story URL: {storyUrl ? <a href={storyUrl} target="_blank" rel="noreferrer">{storyUrl}</a> : <em>set Distribution &rarr; SHADOW post slug</em>}
        </div>
        <div style={{ fontSize: '0.8125rem' }}>
          Listen URL: {listenUrl ? <a href={listenUrl} target="_blank" rel="noreferrer">{listenUrl}</a> : <em>set the release slug</em>}
        </div>
      </div>

      <div style={{ marginBottom: 4, fontSize: '0.8125rem', fontWeight: 500 }}>SHADOW markers (copy-paste into Ghost)</div>
      {tracks.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--theme-elevation-500)' }}>
          {id ? 'No tracks found for this release yet.' : 'Save the release once to generate track markers.'}
        </p>
      )}
      {tracks.map((track) => (
        <div key={track.id} style={rowStyle}>
          <span style={{ fontSize: '0.8125rem' }}>{track.title}</span>
          <button
            type="button"
            style={copyButtonStyle}
            disabled={!slug || !track.shareId}
            onClick={() => copyMarker(track)}
          >
            {copiedId === track.id ? 'Copied' : 'Copy SHADOW marker'}
          </button>
        </div>
      ))}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--theme-elevation-150)' }}>
        <div style={rowStyle}>
          <span style={{ fontSize: '0.8125rem' }}>
            Run player preview
            {previewAttestedAt ? (
              <span style={{ color: 'var(--theme-elevation-500)' }}> — last attested {new Date(previewAttestedAt).toLocaleString()}</span>
            ) : null}
          </span>
          <button type="button" style={disabledButtonStyle} disabled title="MYRADIO preview service not yet available (Workstream 1B)">
            Not yet available
          </button>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ fontSize: '0.8125rem' }}>
            Verify analytics
            {analyticsVerifiedAt ? (
              <span style={{ color: 'var(--theme-elevation-500)' }}> — last verified {new Date(analyticsVerifiedAt).toLocaleString()}</span>
            ) : null}
          </span>
          <button type="button" style={disabledButtonStyle} disabled title="PostHog analytics gate not yet available (Workstream 1B/4)">
            Not yet available
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)', marginTop: 8, marginBottom: 0 }}>
          These two actions are intentionally disabled. They depend on MYRADIO preview routes and the PostHog analytics
          gate, neither of which exist yet (Workstream 1B). Publishing to &ldquo;Analytics verified&rdquo;, &ldquo;Scheduled&rdquo;, or
          &ldquo;Published&rdquo; will be blocked with a clear error until a real preview and a real passing analytics receipt
          exist for this release — see src/hooks/validatePublishTransition.ts.
        </p>
      </div>
    </div>
  )
}
