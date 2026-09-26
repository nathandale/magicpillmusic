// DEMUPUB — Decentralized Music Publisher
import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { siteShareCardField } from '../fields/shareCard'

/**
 * MY RADIO's own skinning, separate from any release: today, the share card for
 * myradio.nathandale.com itself. Read publicly as /feeds/myradio-site.
 */
export const MyRadioSettings: GlobalConfig = {
  slug: 'myradio-settings',
  label: 'MY RADIO',
  admin: {
    group: 'DEMUPUB',
  },
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [siteShareCardField()],
}
