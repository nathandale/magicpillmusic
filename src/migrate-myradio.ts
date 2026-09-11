/**
 * One-shot, idempotent migration: import MY RADIO's static playlists into DEMU.
 *
 * Reads the public playlist manifest + catalogs from myradio.nathandale.com and
 * creates the matching Artists, Releases, Tracks, artwork Media, and funding links.
 * Audio is NOT re-uploaded — tracks point at the existing files via audioUrl.
 *
 * Safe to re-run: existing records (by slug) are skipped, nothing is deleted.
 *
 *   pnpm migrate:myradio          # against whatever DATABASE_URL .env points at
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const MYRADIO = 'https://myradio.nathandale.com'

type Manifest = {
  playlists: Array<{ slug: string; title: string; description?: string; catalogUrl: string }>
}
type Catalog = {
  artist?: string
  donations?: Record<string, string>
  tracks: Array<{ id?: string; title: string; artist?: string; src: string; artwork?: string; duration?: number }>
}

// Which DEMU artist owns each playlist. Anything not listed falls back to Nathan Dale.
const ARTIST_BY_SLUG: Record<string, { name: string; slug: string }> = {
  'looking-star': { name: 'Looking Star', slug: 'looking-star' },
  'the-wooden-revolt': { name: 'The Wooden Revolt', slug: 'the-wooden-revolt' },
}
const DEFAULT_ARTIST = { name: 'Nathan Dale', slug: 'nathan-dale' }

const FUNDING_LABELS: Record<string, string> = {
  venmo: 'Venmo',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  buymeacoffee: 'Buy Me a Coffee',
  lightning: 'Lightning',
}

const slugify = (value: string): string =>
  value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const abs = (path: string): string => (path.startsWith('http') ? path : `${MYRADIO}${path}`)

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return (await res.json()) as T
}

async function fetchFile(url: string): Promise<{ data: Buffer; mimetype: string; name: string; size: number }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  const data = Buffer.from(await res.arrayBuffer())
  return {
    data,
    mimetype: res.headers.get('content-type') || 'application/octet-stream',
    name: url.split('/').pop() || 'artwork',
    size: data.length,
  }
}

async function migrate(): Promise<void> {
  const payload = await getPayload({ config })
  const manifest = await fetchJson<Manifest>(`${MYRADIO}/my-radio/playlists.json`)
  console.log(`Found ${manifest.playlists.length} playlists on ${MYRADIO}`)

  // Every migrated artist is owned by the first admin user, so the Artists access
  // rule (`user === req.user.id` for non-admins) never leaves them un-editable.
  const owner = await payload.find({ collection: 'users', sort: 'id', limit: 1 })
  const ownerId = owner.docs[0]?.id
  if (!ownerId) throw new Error('No users exist — create the admin account before migrating.')
  console.log(`Owner for migrated artists: user #${ownerId}`)

  const artistIds = new Map<string, number>()
  const ensureArtist = async (def: { name: string; slug: string }): Promise<number> => {
    if (artistIds.has(def.slug)) return artistIds.get(def.slug)!
    const existing = await payload.find({ collection: 'artists', where: { slug: { equals: def.slug } }, limit: 1 })
    const id = existing.docs[0]?.id
      ?? (await payload.create({ collection: 'artists', data: { name: def.name, slug: def.slug, status: 'active', user: ownerId } })).id
    artistIds.set(def.slug, id)
    console.log(`  artist ${existing.docs[0] ? 'exists' : 'created'}: ${def.name} (#${id})`)
    return id
  }

  for (const entry of manifest.playlists) {
    console.log(`\n▶ ${entry.slug}`)
    const existingRelease = await payload.find({ collection: 'releases', where: { slug: { equals: entry.slug } }, limit: 1 })
    if (existingRelease.docs[0]) {
      console.log(`  release exists (#${existingRelease.docs[0].id}) — skipping`)
      continue
    }

    const catalog = await fetchJson<Catalog>(abs(entry.catalogUrl))
    const artistId = await ensureArtist(ARTIST_BY_SLUG[entry.slug] ?? DEFAULT_ARTIST)

    // Artwork: take the first track's artwork as the release cover.
    let coverImageId: number | undefined
    const artworkPath = catalog.tracks.find((t) => t.artwork)?.artwork
    if (artworkPath) {
      try {
        const file = await fetchFile(abs(artworkPath))
        const media = await payload.create({ collection: 'media', data: { alt: `${entry.title} cover` }, file })
        coverImageId = media.id
        console.log(`  artwork uploaded: ${file.name} (#${media.id})`)
      } catch (err) {
        console.warn(`  artwork skipped: ${(err as Error).message}`)
      }
    }

    const fundingLinks = Object.entries(catalog.donations ?? {})
      .filter(([, url]) => url)
      .map(([provider, url]) => ({ label: FUNDING_LABELS[provider] ?? provider, url }))

    const release = await payload.create({
      collection: 'releases',
      data: {
        title: entry.title,
        slug: entry.slug,
        type: catalog.tracks.length > 1 ? 'album' : 'single',
        medium: 'music',
        artist: artistId,
        description: entry.description ?? '',
        coverImage: coverImageId,
        fundingLinks,
        status: 'published',
        releaseDate: new Date().toISOString(),
      },
    })
    console.log(`  release created: "${entry.title}" (#${release.id}, ${fundingLinks.length} funding link(s))`)

    let n = 0
    for (const [index, track] of catalog.tracks.entries()) {
      const baseSlug = slugify(track.title) || `track-${index + 1}`
      await payload.create({
        collection: 'tracks',
        data: {
          title: track.title,
          slug: `${entry.slug}-${baseSlug}`,
          release: release.id,
          trackNumber: index + 1,
          audioUrl: abs(track.src),
          mimeType: 'audio/mpeg',
          duration: typeof track.duration === 'number' ? Math.round(track.duration) : undefined,
          explicit: false,
        },
      })
      n++
    }
    console.log(`  tracks created: ${n}`)
  }

  console.log('\nDone. Publisher feed: /feeds/publisher')
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
