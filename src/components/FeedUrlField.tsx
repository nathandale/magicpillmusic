'use client'

import { useFormFields } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

export const FeedUrlField: UIFieldClientComponent = () => {
  const slug = useFormFields(([fields]) => fields.slug?.value as string | undefined)

  if (!slug) {
    return (
      <div style={{ padding: '8px 0' }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.8125rem' }}>
          Feed URL
        </label>
        <span style={{ color: 'var(--theme-elevation-500)', fontSize: '0.8125rem' }}>
          Enter a slug to generate feed URL
        </span>
      </div>
    )
  }

  const feedPath = `/feeds/${encodeURIComponent(slug)}`

  return (
    <div style={{ padding: '8px 0' }}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.8125rem' }}>
        Feed URL
      </label>
      <a
        href={feedPath}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}
      >
        {feedPath}
      </a>
    </div>
  )
}
