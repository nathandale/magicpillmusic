import 'dotenv/config'
import { getPayload } from 'payload'

import config from '@payload-config'

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
