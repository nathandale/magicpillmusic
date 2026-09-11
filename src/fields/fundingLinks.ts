import type { ArrayField } from 'payload'

/**
 * Shared payment/support links, used on both Releases (defaults for the whole
 * release) and Tracks (per-song override). Carried in the feed as
 * <podcast:funding>. `provider` drives the button label/icon and is the hook for
 * future handle validation; `url` is the actual link the button opens.
 */
export const PROVIDER_OPTIONS = [
  { label: 'Cash App', value: 'cashapp' },
  { label: 'Venmo', value: 'venmo' },
  { label: 'PayPal', value: 'paypal' },
  { label: 'Buy Me a Coffee', value: 'buymeacoffee' },
  { label: 'Ko-fi', value: 'kofi' },
  { label: 'Lightning', value: 'lightning' },
  { label: 'Other', value: 'other' },
] as const

export const fundingLinksField = (overrides: Partial<ArrayField> = {}): ArrayField => ({
  name: 'fundingLinks',
  type: 'array',
  admin: {
    description: 'Payment / support links shown in the player (podcast:funding). Add as many as you like.',
    ...(overrides.admin ?? {}),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          defaultValue: 'other',
          options: [...PROVIDER_OPTIONS],
          admin: {
            width: '40%',
            description: 'Sets the button label and icon',
          },
        },
        {
          name: 'label',
          type: 'text',
          admin: {
            width: '60%',
            description: 'Optional custom button text (defaults to the provider name)',
          },
        },
      ],
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        // Format hints only for now; hard validation comes later.
        description:
          'Full link. e.g. Cash App https://cash.app/$handle · Venmo https://venmo.com/u/handle · PayPal https://paypal.me/handle · Lightning: an address like you@getalby.com',
      },
    },
  ],
  ...(overrides.name ? { name: overrides.name } : {}),
  ...(overrides.label ? { label: overrides.label } : {}),
})
