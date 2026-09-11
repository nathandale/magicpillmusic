/**
 * One-shot: copy each channel's MY RADIO presentation (kicker, theme, heartUrl, token,
 * default, terrestrialHandoff) from the legacy playlists.json into the DEMU release,
 * so the static file can be retired. Idempotent — only fills fields that are empty.
 *
 *   pnpm populate:myradio
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Release } from '@/payload-types'

const MANIFEST = 'https://myradio.nathandale.com/my-radio/playlists.json'

type Theme = NonNullable<NonNullable<Release['myradio']>['theme']>
const THEMES: Theme[] = ['catalog', 'terrestrial', 'nathan-archive', 'wooden-revolt', 'parade', 'monochrome']
const asTheme = (value: string | null | undefined): Theme =>
  THEMES.includes(value as Theme) ? (value as Theme) : 'catalog'

type Manifest = {
  defaultPlaylist?: string
  playlists: Array<{ slug: string; kicker?: string; desktopTheme?: string; heartUrl?: string; token?: string }>
}

async function run(): Promise<void> {
  const payload = await getPayload({ config })
  const res = await fetch(MANIFEST)
  if (!res.ok) throw new Error(`${MANIFEST} → ${res.status}`)
  const manifest = (await res.json()) as Manifest

  for (const entry of manifest.playlists) {
    const found = await payload.find({ collection: 'releases', where: { slug: { equals: entry.slug } }, limit: 1 })
    const release = found.docs[0]
    if (!release) { console.log(`  ${entry.slug}: no release — skipped`); continue }

    const current = release.myradio ?? {}
    const next = {
      kicker: current.kicker || entry.kicker || undefined,
      theme: current.theme || asTheme(entry.desktopTheme),
      heartUrl: current.heartUrl || entry.heartUrl || undefined,
      token: current.token || entry.token || undefined,
      isDefault: current.isDefault || entry.slug === manifest.defaultPlaylist,
      terrestrialHandoff: current.terrestrialHandoff || entry.slug === 'my-radio',
    }
    await payload.update({ collection: 'releases', id: release.id, data: { myradio: next } })
    console.log(`  ${entry.slug}: kicker="${next.kicker}" theme=${next.theme} token=${next.token}${next.isDefault ? ' DEFAULT' : ''}${next.terrestrialHandoff ? ' HANDOFF' : ''}`)
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
