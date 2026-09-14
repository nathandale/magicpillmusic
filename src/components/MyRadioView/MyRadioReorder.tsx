'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast, useConfig } from '@payloadcms/ui'

type Channel = {
  id: string | number
  title: string
  slug: string
  kicker: string
  theme: string
  isDefault: boolean
  coverUrl: string | null
  order: number
}

const STEP = 10

// Read a release doc into the flat shape the panel renders.
function toChannel(doc: Record<string, unknown>): Channel {
  const myradio = (doc.myradio ?? {}) as Record<string, unknown>
  const cover = doc.coverImage as { url?: string; sizes?: { thumbnail?: { url?: string } } } | null | undefined
  return {
    id: doc.id as string | number,
    title: (doc.title as string) || (doc.slug as string) || 'Untitled',
    slug: (doc.slug as string) || '',
    kicker: (myradio.kicker as string) || '',
    theme: (myradio.theme as string) || 'catalog',
    isDefault: Boolean(myradio.isDefault),
    coverUrl: cover?.sizes?.thumbnail?.url || cover?.url || null,
    order: typeof myradio.order === 'number' ? (myradio.order as number) : 100,
  }
}

export const MyRadioReorder: React.FC = () => {
  const { config } = useConfig()
  const apiRoute = config.routes.api || '/api'

  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${apiRoute}/releases?limit=200&depth=1&sort=myradio.order`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`Failed to load releases (${res.status})`)
      const data = await res.json()
      const docs = (data.docs || []) as Record<string, unknown>[]
      const list = docs.map(toChannel).sort((a, b) => a.order - b.order)
      setChannels(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels')
    } finally {
      setLoading(false)
    }
  }, [apiRoute])

  useEffect(() => {
    void load()
  }, [load])

  // Persist the current visual order by rewriting myradio.order to 10,20,30…
  // Only the channels whose value actually changed are written.
  const persist = useCallback(
    async (next: Channel[]) => {
      const changed = next
        .map((channel, index) => ({ channel, nextOrder: (index + 1) * STEP }))
        .filter(({ channel, nextOrder }) => channel.order !== nextOrder)

      if (changed.length === 0) return

      setSaving(true)
      try {
        await Promise.all(
          changed.map(({ channel, nextOrder }) =>
            fetch(`${apiRoute}/releases/${channel.id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ myradio: { order: nextOrder } }),
            }).then((res) => {
              if (!res.ok) throw new Error(`${channel.title} (${res.status})`)
            }),
          ),
        )
        setChannels(next.map((channel, index) => ({ ...channel, order: (index + 1) * STEP })))
        toast.success('Channel order saved')
      } catch (err) {
        toast.error(`Could not save: ${err instanceof Error ? err.message : 'unknown error'}`)
        void load() // reload the true order so the panel never lies
      } finally {
        setSaving(false)
      }
    },
    [apiRoute, load],
  )

  const handleDrop = useCallback(
    (targetIndex: number) => {
      const from = dragIndex.current
      dragIndex.current = null
      setOverIndex(null)
      if (from === null || from === targetIndex) return
      setChannels((current) => {
        const next = [...current]
        const [moved] = next.splice(from, 1)
        next.splice(targetIndex, 0, moved)
        void persist(next)
        return next
      })
    },
    [persist],
  )

  const move = useCallback(
    (index: number, delta: number) => {
      const target = index + delta
      if (target < 0 || target >= channels.length) return
      const next = [...channels]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      setChannels(next)
      void persist(next)
    },
    [channels, persist],
  )

  if (loading) return <p style={{ color: 'var(--theme-elevation-500)' }}>Loading channels…</p>
  if (error)
    return (
      <p style={{ color: 'var(--theme-error-500)' }}>
        {error}{' '}
        <button type="button" onClick={() => void load()} style={linkButton}>
          retry
        </button>
      </p>
    )
  if (channels.length === 0)
    return <p style={{ color: 'var(--theme-elevation-500)' }}>No channels yet.</p>

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
        {channels.map((channel, index) => (
          <div
            key={channel.id}
            draggable
            onDragStart={() => {
              dragIndex.current = index
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (overIndex !== index) setOverIndex(index)
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(index)
            }}
            onDragEnd={() => {
              dragIndex.current = null
              setOverIndex(null)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 6,
              border: '1px solid var(--theme-elevation-150)',
              background:
                overIndex === index ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-50)',
              cursor: 'grab',
              transition: 'background 120ms ease',
            }}
          >
            <span aria-hidden style={{ color: 'var(--theme-elevation-400)', fontSize: 18, lineHeight: 1 }}>
              ⠿
            </span>
            <span
              style={{
                width: 26,
                textAlign: 'right',
                color: 'var(--theme-elevation-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {index + 1}
            </span>
            {channel.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.coverUrl}
                alt=""
                width={44}
                height={44}
                style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 4,
                  background: 'var(--theme-elevation-150)',
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {channel.title}
                </strong>
                {channel.isDefault ? <span style={pill}>DEFAULT</span> : null}
              </span>
              {channel.kicker ? (
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    color: 'var(--theme-elevation-500)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {channel.kicker}
                </span>
              ) : null}
            </span>
            <span style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                aria-label={`Move ${channel.title} up`}
                disabled={index === 0 || saving}
                onClick={() => move(index, -1)}
                style={arrowButton}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${channel.title} down`}
                disabled={index === channels.length - 1 || saving}
                onClick={() => move(index, 1)}
                style={arrowButton}
              >
                ↓
              </button>
            </span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16, color: 'var(--theme-elevation-500)', fontSize: 13 }}>
        {saving ? 'Saving…' : 'Drag a row, or use the arrows. Saves automatically.'}
      </p>
    </div>
  )
}

const arrowButton: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-elevation-800)',
  cursor: 'pointer',
}

const pill: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '2px 6px',
  borderRadius: 999,
  background: 'var(--theme-success-100)',
  color: 'var(--theme-success-700)',
}

const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--theme-text)',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: 0,
}
