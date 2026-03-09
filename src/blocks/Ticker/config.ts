import type { Block } from 'payload'

export const Ticker: Block = {
  slug: 'ticker',
  interfaceName: 'TickerBlock',
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Ticker Items',
      minRows: 1,
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
          label: 'Text',
        },
      ],
    },
    {
      name: 'speed',
      type: 'number',
      defaultValue: 12,
      label: 'Scroll Speed (seconds)',
      admin: {
        step: 1,
        description: 'Lower = faster scrolling',
      },
    },
  ],
  labels: {
    plural: 'Tickers',
    singular: 'Ticker',
  },
}
