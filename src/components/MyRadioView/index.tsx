import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import React from 'react'

import { MyRadioReorder } from './MyRadioReorder'

export function MyRadioView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <h1 style={{ marginBottom: 8 }}>MY RADIO</h1>
        <p style={{ marginBottom: 24, color: 'var(--theme-elevation-500)', maxWidth: 640 }}>
          The order of channels on myradio.nathandale.com. Drag a channel to move it; the top row
          shows first. Changes save on their own.
        </p>
        <MyRadioReorder />
      </Gutter>
    </DefaultTemplate>
  )
}
