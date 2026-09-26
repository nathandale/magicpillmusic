import type { Condition, Field, GroupField } from 'payload'

/**
 * Share cards are the 1200×630 link-preview images (Signal, iMessage, Facebook…)
 * MY RADIO shows for a song link. They are a separate layer from the Signal Card
 * player theme: they never change playback, so they deliberately sit OUTSIDE the
 * publication gate (see releasePublicationSnapshot / trackMutationSnapshot in
 * src/hooks/managePublicationState.ts) and can be edited on a live release.
 *
 * Inheritance: Release `shareCard` is the default for every track in it. A Track
 * uses it unless “Use default card from Release” is unticked; then any override
 * field left blank still falls back to the release value. Text fields accept
 * {track}, {artist}, {release} and {year}.
 */

export const SHARE_CARD_LAYOUTS = ['broadcast', 'poster', 'terrestrial', 'image'] as const
export type ShareCardLayout = (typeof SHARE_CARD_LAYOUTS)[number]

const LAYOUT_OPTIONS = [
  { label: 'Broadcast: artwork beside the title on a blurred field', value: 'broadcast' },
  { label: 'Poster: artwork fills the card, title along the bottom', value: 'poster' },
  { label: 'TERRESTRIAL: night sky, wordmark and title', value: 'terrestrial' },
  { label: 'Custom image: use an uploaded 1200×630 image as-is', value: 'image' },
]

const TOKEN_HINT = 'Use {track}, {artist}, {release} or {year}.'

type Mode = 'release' | 'track' | 'site'

const hexColor = (value: unknown) =>
  value == null || value === '' || /^#[0-9a-fA-F]{6}$/.test(String(value)) || 'Use a 6-digit hex color like #db495a.'

const layoutIs =
  (...layouts: ShareCardLayout[]): Condition =>
  (_data, siblingData) =>
    !siblingData?.layout || layouts.includes(siblingData.layout)

const designFields = (mode: Mode): Field[] => {
  // Release and site cards carry real defaults. Track overrides stay blank so an
  // untouched field keeps inheriting the release, instead of freezing a copy.
  const inherit = mode === 'track'
  const blankNote = inherit ? ' Leave blank to use the release value.' : ''
  const tokens = mode === 'site' ? '' : ` ${TOKEN_HINT}`

  return [
    {
      name: 'layout',
      type: 'select',
      options: LAYOUT_OPTIONS,
      defaultValue: inherit ? undefined : mode === 'site' ? 'terrestrial' : 'broadcast',
      admin: { description: `Card design.${blankNote}` },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'kicker',
          type: 'text',
          maxLength: 60,
          admin: {
            width: '50%',
            condition: layoutIs('broadcast', 'poster', 'terrestrial'),
            description: `Small line above the title.${tokens}${blankNote}`,
          },
        },
        {
          name: 'accentColor',
          type: 'text',
          validate: hexColor,
          defaultValue: inherit ? undefined : '#db495a',
          admin: {
            width: '50%',
            condition: layoutIs('broadcast', 'poster', 'terrestrial'),
            description: `Beacon and kicker color.${blankNote}`,
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'headline',
          type: 'text',
          maxLength: 90,
          defaultValue: inherit ? undefined : mode === 'site' ? 'MY RADIO' : '{track}',
          admin: {
            width: '50%',
            condition: layoutIs('broadcast', 'poster', 'terrestrial'),
            description: `Main title on the card.${tokens}${blankNote}`,
          },
        },
        {
          name: 'subline',
          type: 'text',
          maxLength: 90,
          defaultValue: inherit ? undefined : mode === 'site' ? 'NATHAN DALE' : '{artist}',
          admin: {
            width: '50%',
            condition: layoutIs('broadcast', 'poster', 'terrestrial'),
            description: `Line under the title.${tokens}${blankNote}`,
          },
        },
      ],
    },
    {
      name: 'showWordmark',
      type: 'select',
      // A select (not a checkbox) so a track override can say “inherit”.
      options: [
        { label: 'Show the MY RADIO wordmark', value: 'show' },
        { label: 'Hide the wordmark', value: 'hide' },
      ],
      defaultValue: inherit ? undefined : 'show',
      admin: {
        condition: layoutIs('broadcast', 'poster', 'terrestrial'),
        description: `The MY RADIO wordmark with its beacon.${blankNote}`,
      },
    },
    ...(mode === 'site'
      ? []
      : [
          {
            name: 'artwork',
            type: 'upload',
            relationTo: 'media',
            admin: {
              condition: layoutIs('broadcast', 'poster', 'terrestrial'),
              description:
                mode === 'track'
                  ? 'Card-only artwork. Leave blank to use this song’s artwork.'
                  : 'Card-only artwork for every song. Leave blank so each card uses its own song’s artwork.',
            },
          } satisfies Field,
        ]),
    {
      name: 'background',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: layoutIs('broadcast', 'terrestrial'),
        description: `Background image. Blank uses the blurred artwork (Broadcast) or the TERRESTRIAL night sky.${blankNote}`,
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_data, siblingData) => siblingData?.layout === 'image',
        description: 'A finished 1200×630 card. It is cropped to fit if the shape differs.',
      },
    },
    {
      type: 'collapsible',
      label: 'Link text',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'linkTitle',
          type: 'text',
          maxLength: 120,
          admin: {
            description:
              mode === 'site'
                ? 'Bold title under the card. Blank uses “MY RADIO / Nathan Dale”.'
                : `Bold title under the card.${tokens} Blank uses “{track} by {artist} | MY RADIO”.${blankNote}`,
          },
        },
        {
          name: 'linkDescription',
          type: 'textarea',
          maxLength: 300,
          admin: {
            description:
              mode === 'site'
                ? 'Short description some apps show under the title.'
                : `Short description some apps show under the title.${tokens} Blank uses the song’s share excerpt, then the release description.${blankNote}`,
          },
        },
      ],
    },
  ]
}

const preview = (): Field => ({
  name: 'shareCardPreview',
  type: 'ui',
  admin: {
    components: {
      Field: '/components/ShareCardPreview#ShareCardPreview',
    },
  },
})

export const releaseShareCardField = (): GroupField => ({
  name: 'shareCard',
  type: 'group',
  label: 'Share card (default for every song)',
  admin: {
    description:
      'The link-preview image for this release’s songs in Signal, iMessage, Facebook and other apps. Each card uses its own song’s artwork. Songs can override it on their own Share card. Editable while the release is live.',
  },
  fields: [preview(), ...designFields('release')],
})

export const trackShareCardField = (): GroupField => ({
  name: 'shareCard',
  type: 'group',
  label: 'Share card',
  admin: {
    description: 'The link-preview image for this song. Editable while the release is live.',
  },
  fields: [
    {
      name: 'useReleaseDefault',
      type: 'checkbox',
      label: 'Use default card from Release',
      defaultValue: true,
    },
    preview(),
    {
      type: 'collapsible',
      label: 'Override for this song',
      admin: { condition: (_data, siblingData) => siblingData?.useReleaseDefault === false },
      fields: designFields('track'),
    },
  ],
})

export const siteShareCardField = (): GroupField => ({
  name: 'siteCard',
  type: 'group',
  label: 'Homepage share card',
  admin: {
    description: 'The link-preview image for myradio.nathandale.com itself.',
  },
  fields: [preview(), ...designFields('site')],
})
