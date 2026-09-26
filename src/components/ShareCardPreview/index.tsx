'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

const frameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 600,
  aspectRatio: '1200 / 630',
  borderRadius: 6,
  overflow: 'hidden',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-50)',
}

const noteStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500)',
  fontSize: '0.8125rem',
  margin: '6px 0 16px',
}

const toBase64Url = (value: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Live 1200×630 preview for a Share card group. It sends the group's current
 * (unsaved) values to /cards/preview, which resolves them exactly like the
 * public card route, so what you see here is what Signal or Facebook will get.
 */
export const ShareCardPreview: UIFieldClientComponent = ({ path }) => {
  const { id, collectionSlug, globalSlug } = useDocumentInfo()
  const [fields] = useAllFormFields()
  const groupPath = String(path ?? '').split('.').slice(0, -1).join('.')

  // Collect this group's values, e.g. shareCard.layout → { layout }.
  const designJson = useMemo(() => {
    const design: Record<string, unknown> = {}
    const prefix = `${groupPath}.`
    for (const [key, field] of Object.entries(fields ?? {})) {
      if (!key.startsWith(prefix)) continue
      const name = key.slice(prefix.length)
      // Skip nested paths, this UI field, and Payload's unnamed row/collapsible keys (_index-N).
      if (name.includes('.') || name.startsWith('_') || name === 'shareCardPreview') continue
      design[name] = field?.value ?? null
    }
    return JSON.stringify(design)
  }, [fields, groupPath])

  const kind = globalSlug === 'myradio-settings' ? 'site' : collectionSlug === 'releases' ? 'release' : collectionSlug === 'tracks' ? 'track' : null
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!kind || (kind !== 'site' && !id)) return
    // Debounced so typing a headline does not render on every keystroke.
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ kind, d: toBase64Url(designJson) })
      if (id) params.set('id', String(id))
      setLoading(true)
      setFailed(false)
      setSrc(`/cards/preview?${params.toString()}`)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [designJson, id, kind])

  if (!kind) return null
  if (kind !== 'site' && !id) {
    return <p style={noteStyle}>Save this {kind} once to see its share card preview.</p>
  }

  const design = JSON.parse(designJson) as { useReleaseDefault?: boolean }
  const note =
    kind === 'release'
      ? 'Preview on this release’s first song. Every song gets its own artwork and title.'
      : kind === 'track' && design.useReleaseDefault !== false
        ? 'Using the release’s default card. Untick the box above to change it for this song.'
        : 'Preview updates as you edit. Save to publish it.'

  return (
    <div style={{ margin: '8px 0 4px' }}>
      <div style={frameStyle}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Share card preview"
            width={1200}
            height={630}
            style={{ width: '100%', height: '100%', display: 'block', opacity: loading ? 0.55 : 1, transition: 'opacity 150ms' }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setFailed(true)
            }}
          />
        ) : null}
      </div>
      <p style={noteStyle}>{failed ? 'The preview could not be rendered. Check the images, then try again.' : note}</p>
    </div>
  )
}
