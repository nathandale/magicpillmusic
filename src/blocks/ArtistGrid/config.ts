import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const ArtistGrid: Block = {
  slug: 'artistGrid',
  interfaceName: 'ArtistGridBlock',
  fields: [
    {
      name: 'introContent',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: 'Intro Content',
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 6,
      label: 'Number of Artists to Show',
      admin: {
        step: 1,
      },
    },
  ],
  labels: {
    plural: 'Artist Grids',
    singular: 'Artist Grid',
  },
}
