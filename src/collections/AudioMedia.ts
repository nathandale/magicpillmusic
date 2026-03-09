// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { adminOrPublisher } from '../access/roles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const AudioMedia: CollectionConfig = {
  slug: 'audio-media',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'mimeType', 'filesize', 'createdAt'],
    group: 'DEMUPUB',
  },
  access: {
    create: adminOrPublisher,
    delete: adminOrPublisher,
    read: anyone,
    update: adminOrPublisher,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Display name for this audio file',
      },
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../public/audio'),
    mimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/x-flac',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a',
    ],
  },
}
