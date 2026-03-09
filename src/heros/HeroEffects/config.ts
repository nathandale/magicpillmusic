import type { Field } from 'payload'

const fontOptions = [
  { label: 'Bangers', value: 'bangers' },
  { label: 'VT323', value: 'vt323' },
  { label: 'Black Han Sans', value: 'blackHanSans' },
]

const colorOptions = [
  { label: 'White', value: 'white' },
  { label: 'Red', value: 'red' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Acid Green', value: 'acid' },
  { label: 'White Outline', value: 'outline-white' },
  { label: 'Red Outline', value: 'outline-red' },
]

const animationOptions = [
  { label: 'None', value: 'none' },
  { label: 'Glitch (clip-path)', value: 'glitch1' },
  { label: 'Glitch (hue-rotate)', value: 'glitch2' },
  { label: 'Shake', value: 'shake' },
  { label: 'Pulse Red Glow', value: 'pulse-red' },
  { label: 'Flicker', value: 'flicker' },
]

const sizeOptions = [
  { label: 'XL (18vw)', value: 'xl' },
  { label: 'Large (14vw)', value: 'lg' },
  { label: 'Medium (9vw)', value: 'md' },
  { label: 'Small (5vw)', value: 'sm' },
]

export const heroEffectsFields: Field[] = [
  {
    name: 'preHeading',
    type: 'text',
    label: 'Pre-Heading',
    admin: {
      description: 'Small text above the title (e.g. "⚡ Artist Cooperative · Lightning Network ⚡")',
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
  },
  {
    name: 'titleLines',
    type: 'array',
    label: 'Title Lines',
    minRows: 1,
    maxRows: 5,
    admin: {
      description: 'Each line of the hero title can have its own font, color, size, and animation',
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
    fields: [
      {
        name: 'text',
        type: 'text',
        required: true,
        label: 'Text',
      },
      {
        type: 'row',
        fields: [
          {
            name: 'font',
            type: 'select',
            defaultValue: 'bangers',
            options: fontOptions,
            label: 'Font',
            admin: { width: '25%' },
          },
          {
            name: 'color',
            type: 'select',
            defaultValue: 'white',
            options: colorOptions,
            label: 'Color',
            admin: { width: '25%' },
          },
          {
            name: 'size',
            type: 'select',
            defaultValue: 'xl',
            options: sizeOptions,
            label: 'Size',
            admin: { width: '25%' },
          },
          {
            name: 'animation',
            type: 'select',
            defaultValue: 'none',
            options: animationOptions,
            label: 'Animation',
            admin: { width: '25%' },
          },
        ],
      },
      {
        name: 'enableGhostLayer',
        type: 'checkbox',
        defaultValue: false,
        label: 'Enable Red Ghost Layer',
        admin: {
          description: 'Adds an offset red shadow duplicate behind this line with its own glitch animation',
        },
      },
      {
        name: 'rotation',
        type: 'number',
        defaultValue: 0,
        label: 'Rotation (degrees)',
        admin: {
          step: 0.5,
          description: 'Slight rotation for a hand-placed look (e.g. -2)',
        },
      },
    ],
  },
  {
    name: 'badge',
    type: 'group',
    label: 'Badge',
    admin: {
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
    fields: [
      {
        name: 'enabled',
        type: 'checkbox',
        defaultValue: false,
        label: 'Show Badge',
      },
      {
        name: 'text',
        type: 'text',
        label: 'Badge Text',
        admin: {
          condition: (_, { enabled } = {}) => Boolean(enabled),
          description: 'e.g. "★ Music is Medicine ★"',
        },
      },
    ],
  },
  {
    name: 'tagline',
    type: 'textarea',
    label: 'Tagline',
    admin: {
      description: 'Supporting text below the title. Use {red}text{/red} and {yel}text{/yel} for colored spans.',
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
  },
  {
    name: 'ghostText',
    type: 'text',
    label: 'Background Ghost Text',
    admin: {
      description: 'Large diagonal decorative text behind the hero (e.g. "MPM")',
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
  },
  {
    name: 'enableOrnaments',
    type: 'checkbox',
    defaultValue: false,
    label: 'Show Corner Ornaments',
    admin: {
      condition: (_, { type } = {}) => type === 'heroEffects',
    },
  },
]
