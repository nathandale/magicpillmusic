import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Artists } from './collections/Artists'
import { Releases } from './collections/Releases'
import { Tracks } from './collections/Tracks'
import { ValueSplits } from './collections/ValueSplits'
import { AudioMedia } from './collections/AudioMedia'
import { AnalyticsVerificationReceipts } from './collections/AnalyticsVerificationReceipts'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { PublishingSettings } from './globals/PublishingSettings'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
      // Custom "MY RADIO" admin view: drag-to-reorder the channel list.
      afterNavLinks: ['@/components/MyRadioNavLink#MyRadioNavLink'],
      views: {
        myRadio: {
          Component: '@/components/MyRadioView#MyRadioView',
          path: '/my-radio',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // This project manages schema changes through hand-authored migration files
    // (src/migrations) — Postgres's dev-only automatic "push" schema sync must stay
    // off, or Payload will try to reconcile the live schema against the current
    // config on every startup outside of `payload migrate`, independent of and in
    // addition to the migrations. Confirmed while adding ND-MR-001's new collection:
    // that auto-push generates its own constraint-naming/truncation logic, distinct
    // from `migrate:create`'s, and it does not agree with what the migrations
    // actually created — `pnpm test:int` failed on `getPayload()` initialization
    // with "constraint ... does not exist" until this was set explicitly.
    push: false,
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Artists,
    Releases,
    Tracks,
    ValueSplits,
    AudioMedia,
    AnalyticsVerificationReceipts,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, PublishingSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@magicpillmusic.com',
    defaultFromName: process.env.SMTP_FROM_NAME || 'Magic Pill Music',
    transportOptions: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
