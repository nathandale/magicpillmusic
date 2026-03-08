import type { CollectionConfig } from 'payload'

import { GENRE_OPTIONS } from './Releases'

export const Tracks: CollectionConfig = {
  slug: 'tracks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'release', 'trackNumber', 'createdAt'],
    group: 'Music',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'release',
      type: 'relationship',
      relationTo: 'releases',
      required: true,
    },
    {
      name: 'trackNumber',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        position: 'sidebar',
        description: 'Position in the release tracklist',
      },
    },
    // ── Audio file ──
    {
      name: 'audioFile',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Audio file (MP3/WAV/FLAC/OGG)',
      },
    },
    {
      name: 'audioUrl',
      type: 'text',
      admin: {
        description: 'External audio URL (if not using upload)',
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      defaultValue: 'audio/mpeg',
      admin: {
        description: 'Audio MIME type',
      },
    },
    {
      name: 'fileSize',
      type: 'number',
      admin: {
        description: 'File size in bytes',
      },
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Duration in seconds',
      },
    },
    // ── Video (optional) ──
    {
      name: 'videoUrl',
      type: 'text',
      admin: {
        description: 'Video file URL (MP4/MOV/WebM)',
      },
    },
    {
      name: 'videoMimeType',
      type: 'text',
      defaultValue: 'video/mp4',
    },
    {
      name: 'videoFileSize',
      type: 'number',
      admin: {
        description: 'Video file size in bytes',
      },
    },
    // ── Transcript / lyrics ──
    {
      name: 'transcriptUrl',
      type: 'text',
      admin: {
        description: 'WebVTT file URL for lyrics/captions',
      },
    },
    // ── Per-track overrides ──
    {
      name: 'artwork',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Per-track artwork override (falls back to release cover)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'explicit',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isrc',
      type: 'text',
      admin: {
        description: 'International Standard Recording Code',
      },
    },
    // ── Genre override ──
    {
      name: 'genre',
      type: 'select',
      options: GENRE_OPTIONS,
      admin: {
        description: 'Per-track genre override (falls back to release genre)',
      },
    },
    {
      name: 'subgenres',
      type: 'array',
      maxRows: 4,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    // ── GUID ──
    {
      name: 'guid',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stable feed GUID (auto-generated)',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data?.guid) {
          data!.guid = `mpm-track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        return data
      },
    ],
  },
}
