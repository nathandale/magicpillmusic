import 'dotenv/config'
import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import config from '@payload-config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_FEED_URL = 'http://localhost:3000'

async function seed(): Promise<void> {
  const payload = await getPayload({ config })
  const releaseDate = new Date().toISOString()

  console.log('Clearing existing data...')

  await payload.delete({
    collection: 'value-splits',
    where: {},
  })

  await payload.delete({
    collection: 'tracks',
    where: {},
  })

  await payload.delete({
    collection: 'releases',
    where: {},
  })

  await payload.delete({
    collection: 'artists',
    where: {},
  })

  console.log('Updating publishing settings...')
  await payload.updateGlobal({
    slug: 'publishing-settings',
    data: {
      baseFeedUrl: BASE_FEED_URL,
      podcastTitle: 'Magic Pill Music',
      podcastDescription: 'Independent music publishing',
      language: 'en',
      defaultCopyright: '© 2026 Magic Pill Music',
      defaultCategory: 'Music',
      ownerName: 'Nathan Dale',
      ownerEmail: 'nathan@magicpillmusic.com',
      publisherName: 'Magic Pill Music',
      publisherUrl: 'https://magicpillmusic.com',
      defaultSuggestedSats: 5000,
    },
  })

  console.log('Creating artist...')
  const artist = await payload.create({
    collection: 'artists',
    data: {
      name: 'Nathan Dale',
      slug: 'nathan-dale',
      bio: 'Independent musician and podcaster',
      website: 'https://nathandale.com',
      lightningAddress: 'nathan@getalby.com',
      status: 'active',
    },
  })

  console.log('Creating album release...')
  const album = await payload.create({
    collection: 'releases',
    data: {
      title: 'Echoes of Tomorrow',
      slug: 'echoes-of-tomorrow',
      type: 'album',
      medium: 'music',
      artist: artist.id,
      description: 'A journey through sound and time',
      explicit: false,
      genre: 'Alternative',
      subgenres: [{ name: 'Indie' }, { name: 'Electronic' }],
      feedLocked: false,
      license: 'Creative Commons BY 4.0',
      upc: '123456789012',
      location: 'Nashville, TN',
      socialUrl: 'https://nostr.com/nathan',
      fundingLinks: [{ label: 'Support on Ko-fi', url: 'https://ko-fi.com/nathandale' }],
      suggestedSats: 5000,
      status: 'published',
      releaseDate,
    },
  })

  console.log('Creating album tracks...')
  await payload.create({
    collection: 'tracks',
    data: {
      title: 'Morning Light',
      slug: 'morning-light',
      release: album.id,
      trackNumber: 1,
      audioUrl: 'https://example.com/audio/morning-light.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 8500000,
      duration: 245,
      explicit: false,
    },
  })

  await payload.create({
    collection: 'tracks',
    data: {
      title: 'Digital Dreams',
      slug: 'digital-dreams',
      release: album.id,
      trackNumber: 2,
      audioUrl: 'https://example.com/audio/digital-dreams.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 9200000,
      duration: 312,
      videoUrl: 'https://example.com/video/digital-dreams.mp4',
      videoMimeType: 'video/mp4',
      videoFileSize: 45000000,
      transcriptUrl: 'https://example.com/vtt/digital-dreams.vtt',
      isrc: 'USRC12345678',
      explicit: false,
    },
  })

  await payload.create({
    collection: 'tracks',
    data: {
      title: 'Sunset Boulevard',
      slug: 'sunset-boulevard',
      release: album.id,
      trackNumber: 3,
      audioUrl: 'https://example.com/audio/sunset-boulevard.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 7800000,
      duration: 198,
      explicit: false,
    },
  })

  console.log('Creating single release...')
  const single = await payload.create({
    collection: 'releases',
    data: {
      title: 'Midnight Run',
      slug: 'midnight-run',
      type: 'single',
      medium: 'music',
      artist: artist.id,
      description: 'A late-night driving anthem',
      explicit: true,
      genre: 'Rock',
      subgenres: [{ name: 'Indie Rock' }],
      feedLocked: true,
      suggestedSats: 3000,
      status: 'published',
      releaseDate,
    },
  })

  console.log('Creating single track...')
  await payload.create({
    collection: 'tracks',
    data: {
      title: 'Midnight Run',
      slug: 'midnight-run-track',
      release: single.id,
      trackNumber: 1,
      audioUrl: 'https://example.com/audio/midnight-run.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 10500000,
      duration: 278,
      isrc: 'USRC12345679',
      explicit: true,
    },
  })

  console.log('Creating value splits for album...')
  await payload.create({
    collection: 'value-splits',
    data: {
      release: album.id,
      recipientName: 'Nathan Dale',
      lightningAddress: 'nathan@getalby.com',
      percentage: 90,
      role: 'Artist',
    },
  })

  await payload.create({
    collection: 'value-splits',
    data: {
      release: album.id,
      recipientName: 'Magic Pill Music',
      lightningAddress: 'mpm@getalby.com',
      percentage: 10,
      role: 'Publisher',
    },
  })

  console.log('Creating value splits for single...')
  await payload.create({
    collection: 'value-splits',
    data: {
      release: single.id,
      recipientName: 'Nathan Dale',
      lightningAddress: 'nathan@getalby.com',
      percentage: 85,
      role: 'Artist',
    },
  })

  await payload.create({
    collection: 'value-splits',
    data: {
      release: single.id,
      recipientName: 'Jane Producer',
      lightningAddress: 'jane@getalby.com',
      percentage: 15,
      role: 'Producer',
    },
  })

  console.log('Creating hero media...')
  const heroImagePath = path.resolve(__dirname, '../public/images/theme/hero_bg.webp')
  const heroImageBuffer = fs.readFileSync(heroImagePath)
  const heroMedia = await payload.create({
    collection: 'media',
    data: {
      alt: 'Magic Pill Music hero background',
    },
    file: {
      data: heroImageBuffer,
      mimetype: 'image/webp',
      name: 'hero_bg.webp',
      size: heroImageBuffer.length,
    },
  })

  console.log('Seeding homepage...')

  const existingHome = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })
  if (existingHome.docs.length > 0) {
    await payload.delete({
      collection: 'pages',
      id: existingHome.docs[0].id,
      context: { disableRevalidate: true },
    })
  }

  await payload.create({
    collection: 'pages',
    context: { disableRevalidate: true },
    data: {
      slug: 'home',
      title: 'Home',
      _status: 'published',
      hero: {
        type: 'heroEffects',
        media: heroMedia.id,
        preHeading: '\u26A1 Artist Cooperative \u00B7 Lightning Network \u26A1',
        titleLines: [
          {
            text: 'Magic',
            font: 'bangers',
            color: 'white',
            size: 'xl',
            animation: 'glitch1',
            enableGhostLayer: true,
            rotation: 0,
          },
          {
            text: 'Pill',
            font: 'bangers',
            color: 'yellow',
            size: 'lg',
            animation: 'none',
            enableGhostLayer: false,
            rotation: 0,
          },
          {
            text: 'Music',
            font: 'blackHanSans',
            color: 'outline-white',
            size: 'md',
            animation: 'none',
            enableGhostLayer: false,
            rotation: -2,
          },
        ],
        badge: {
          enabled: true,
          text: '\u2605 Music is Medicine \u2605',
        },
        tagline:
          '{red}Direct payments.{/red} No middlemen.\n{yel}90%{/yel} to the artist. Every sat. Every time.',
        ghostText: 'MPM',
        enableOrnaments: true,
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Explore Artists',
              url: '/artists',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'How It Works',
              url: '/releases',
            },
          },
        ],
      },
      layout: [
        {
          blockName: 'Ticker',
          blockType: 'ticker',
          items: [
            { text: 'NEW RELEASES DROPPING WEEKLY' },
            { text: 'STREAM WITH VALUE4VALUE' },
            { text: 'SUPPORT ARTISTS DIRECTLY' },
            { text: 'PODCASTING 2.0 POWERED' },
            { text: 'INDEPENDENT MUSIC ONLY' },
          ],
          speed: 14,
        },
        {
          blockName: 'Artist Grid',
          blockType: 'artistGrid',
          introContent: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Our Artists',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  tag: 'h2',
                  version: 1,
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Independent creators publishing through Magic Pill Music',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  textFormat: 0,
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
          limit: 6,
        },
        {
          blockName: 'CTA',
          blockType: 'cta',
          links: [
            {
              link: {
                type: 'custom',
                appearance: 'default',
                label: 'View All Releases',
                url: '/releases',
              },
            },
          ],
          richText: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Support Independent Music',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  tag: 'h3',
                  version: 1,
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Every stream sends sats directly to the artists. No middlemen. No gatekeepers. Just music and value.',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  textFormat: 0,
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
      ],
      meta: {
        title: 'Magic Pill Music — Independent Music Publishing',
        description:
          'Independent music publishing powered by Podcasting 2.0 and Value4Value. Discover artists, stream music, and support creators directly.',
      },
    },
  })

  console.log('Homepage created.')

  console.log('Seeding header navigation...')
  await payload.updateGlobal({
    slug: 'header',
    context: { disableRevalidate: true },
    data: {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Artists',
            url: '/artists',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Releases',
            url: '/releases',
          },
        },
      ],
    },
  })

  console.log('Header navigation seeded.')

  console.log('Seeding footer navigation...')
  await payload.updateGlobal({
    slug: 'footer',
    context: { disableRevalidate: true },
    data: {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Artists',
            url: '/artists',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Releases',
            url: '/releases',
          },
        },
      ],
    },
  })

  console.log('Footer navigation seeded.')

  console.log('Seed complete.')
  console.log(`Feed URL: ${BASE_FEED_URL}/feeds/echoes-of-tomorrow.xml`)
  console.log(`Feed URL: ${BASE_FEED_URL}/feeds/midnight-run.xml`)
}

seed()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
