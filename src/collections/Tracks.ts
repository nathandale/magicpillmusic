// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { isAdmin, publisherFieldAccess } from '../access/roles'
import {
  TRACK_READINESS_OPTIONS,
  readPublishedOrAuthenticated,
  serverControlledFieldAccess,
  trackReadinessFieldAccess,
} from '../access/workflowTransitions'
import { GENRE_OPTIONS } from './Releases'
import type { User } from '@/payload-types'
import { fundingLinksField } from '../fields/fundingLinks'
import { validateTrackReadinessTransition } from '../hooks/validatePublishTransition'
import {
  invalidateReleasePreviewOnTrackChange,
  invalidateReleasePreviewOnTrackDelete,
  protectPublishedReleaseTrackDelete,
  protectPublishedReleaseTrackMutation,
} from '../hooks/managePublicationState'

export const Tracks: CollectionConfig = {
  slug: 'tracks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'release', 'trackNumber', 'createdAt'],
    group: 'DEMUPUB',
  },
  access: {
    // See Releases.ts for the same reasoning: drafts are enabled below, so anonymous
    // reads must be gated to published documents only.
    read: readPublishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: ({ req: { user } }) => isAdmin(user as User | null),
  },
  versions: {
    // Deliberately no `schedulePublish` here — tracks don't schedule
    // independently; the parent Release is the sole authority on public visibility
    // and coordinated publication (decision 5, 2026-09-17).
    drafts: {
      autosave: { interval: 100 },
    },
    maxPerDoc: 50,
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
    {
      name: 'audioFile',
      type: 'upload',
      relationTo: 'audio-media',
      admin: {
        description: 'Audio file upload (admin and publisher only)',
      },
      access: {
        update: publisherFieldAccess,
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
    {
      name: 'transcriptUrl',
      type: 'text',
      admin: {
        description: 'WebVTT file URL for lyrics/captions',
      },
    },
    {
      name: 'year',
      type: 'number',
      min: 1900,
      max: 2100,
      admin: {
        description: 'Year this song was released. Shown as a small © line in the MY RADIO info panel.',
        step: 1,
      },
    },
    {
      name: 'songwriters',
      type: 'text',
      maxLength: 300,
      admin: {
        description: 'Songwriter(s), comma-separated. Shown on the back of the artwork in MY RADIO.',
      },
    },
    {
      name: 'personnel',
      type: 'textarea',
      maxLength: 1500,
      admin: {
        description: 'Musicians and what they played — one per line. Shown on the back of the artwork.',
      },
    },
    {
      name: 'story',
      type: 'textarea',
      admin: {
        description: 'Free text about this song. Shown on the back of the artwork; scrolls if long.',
      },
    },
    {
      name: 'hideFunding',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Turn OFF all payment links for this song, even if the release has them. Use this to monetize only some songs on a release.',
      },
    },
    fundingLinksField({
      admin: { description: 'Per-song payment links. When set, these override the release links for this track. (Ignored if “Hide funding” is on.)' },
    }),
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
    {
      name: 'guid',
      type: 'text',
      unique: true,
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stable feed GUID (auto-generated)',
      },
    },
    // ── Signal Card publishing fields (ND-MR-001) ──
    {
      name: 'shareId',
      type: 'text',
      unique: true,
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Immutable, human-safe public track ID (auto-generated from the GUID). Never derived from the title alone.',
      },
    },
    {
      name: 'shareExcerpt',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Optional bounded track-specific share copy.' },
    },
    {
      name: 'lyricsStatus',
      type: 'select',
      defaultValue: 'missing',
      options: [
        { label: 'Missing', value: 'missing' },
        { label: 'Draft', value: 'draft' },
        { label: 'Verified', value: 'verified' },
        { label: 'Not applicable', value: 'not_applicable' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Prevents accidental publication of unverified lyrics — checked by the publish-validation hook.',
      },
    },
    {
      name: 'rightsConfirmed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Attestation that audio, artwork, lyrics, and promotional use are authorized.',
      },
    },
    {
      name: 'rightsConfirmedAt',
      type: 'date',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'rightsConfirmedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: { position: 'sidebar', readOnly: true },
    },
    // Track readiness (decision 5) — deliberately smaller than the Release's
    // workflowState. See src/access/workflowTransitions.ts.
    {
      name: 'trackReadiness',
      type: 'select',
      defaultValue: 'draft',
      options: TRACK_READINESS_OPTIONS,
      access: {
        create: trackReadinessFieldAccess,
        update: trackReadinessFieldAccess,
      },
      admin: {
        position: 'sidebar',
        description: 'This track’s own data/audio readiness. Says nothing about public visibility — that is the parent Release’s decision alone.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      protectPublishedReleaseTrackMutation,
      ({ data, operation, req, originalDoc }) => {
        if (operation === 'create' && !data?.guid) {
          data!.guid = `mpm-track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        // shareId defaults from the (by-then-generated) guid, mirroring the existing
        // guid-generation pattern — never null on a saved track, never derived
        // from the title alone.
        if (!data?.shareId) {
          data!.shareId = data?.guid || `mpm-track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        const wasConfirmed = Boolean(originalDoc?.rightsConfirmed)
        if (data?.rightsConfirmed && !wasConfirmed) {
          data!.rightsConfirmedAt = new Date().toISOString()
          data!.rightsConfirmedBy = req.user?.id ?? data?.rightsConfirmedBy
        }
        return data
      },
      validateTrackReadinessTransition,
    ],
    // A track's own audio/order/identity changing invalidates its parent
    // Release's preview attestation too — the attestation depends on the
    // track-set fingerprint, which only these hooks (not Releases' own) can see
    // changing. See src/hooks/managePublicationState.ts.
    afterChange: [invalidateReleasePreviewOnTrackChange],
    beforeDelete: [protectPublishedReleaseTrackDelete],
    afterDelete: [invalidateReleasePreviewOnTrackDelete],
  },
}
