// DEMUPUB — append-only PostHog verification history (ND-MR-001, decision 4)
import type { Access, CollectionConfig } from 'payload'

import { isPublisher } from '../access/roles'
import type { User } from '@/payload-types'

/**
 * Every attempt at the EO §15 PostHog publishing gate is recorded here permanently —
 * pass or fail, never edited or deleted afterward. This is what makes it genuinely
 * "append-only": the access control below disallows `update` and `delete` entirely,
 * for every role including admin. A bad or superseded attempt is superseded by a new
 * attempt, not corrected in place.
 *
 * Workstream 1A ships this data model only. Nothing in this repo creates a `pass`
 * receipt yet — that requires the "Verify analytics" action and real PostHog API
 * calls, which are Workstream 1B/4 and not authorized. Until then this collection
 * exists so the publish-validation hook has something real to check (and correctly
 * fail closed against, since no receipts exist), and no analytics condition can be
 * satisfied by anything other than a genuine recorded pass.
 */
const disallow: Access = () => false

export const AnalyticsVerificationReceipts: CollectionConfig = {
  slug: 'analytics-verification-receipts',
  // Short dbName: the slug (API route, `relationTo` references) stays fully
  // descriptive, but is long enough that Postgres FK constraint names combining it
  // with the referencing column on Releases exceeded the 63-character identifier
  // limit (hit in practice generating this migration against a scratch DB — see
  // the Workstream 1A completion report).
  dbName: 'avr',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['release', 'outcome', 'environment', 'attemptedAt'],
    group: 'DEMUPUB',
    description: 'Append-only record of every PostHog publishing-gate attempt (EO §15). Never edited or deleted.',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user), // authenticated staff only — not public
    create: ({ req: { user } }) => isPublisher(user as User | null),
    update: disallow,
    delete: disallow,
  },
  fields: [
    {
      name: 'release',
      type: 'relationship',
      relationTo: 'releases',
      required: true,
    },
    {
      name: 'track',
      type: 'relationship',
      relationTo: 'tracks',
      admin: { description: 'Set when verification is track-scoped rather than release-wide.' },
    },
    {
      name: 'attemptedAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'attemptedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'environment',
      type: 'text',
      required: true,
    },
    {
      name: 'outcome',
      type: 'select',
      required: true,
      options: [
        { label: 'Pass', value: 'pass' },
        { label: 'Fail', value: 'fail' },
      ],
    },
    {
      name: 'schemaVersion',
      type: 'number',
    },
    {
      name: 'playerVersion',
      type: 'text',
    },
    {
      name: 'themeVersion',
      type: 'number',
    },
    {
      name: 'sampleEventIds',
      type: 'array',
      fields: [{ name: 'eventId', type: 'text' }],
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data?.attemptedAt) {
          data!.attemptedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, context }) => {
        // Guard against re-entrancy: this hook updates Releases, whose own hooks do
        // not write back to this collection, so there is no cycle today — but the
        // context flag is set anyway per this repo's hook-loop-prevention rule, in
        // case that ever changes.
        if (context?.skipReceiptPointerUpdate) return doc
        if (operation !== 'create' || doc.outcome !== 'pass' || !doc.release) return doc

        const releaseId = typeof doc.release === 'object' ? doc.release.id : doc.release

        await req.payload.update({
          collection: 'releases',
          id: releaseId,
          data: {
            analyticsVerification: {
              latest: doc.id,
              summary: {
                verifiedAt: doc.attemptedAt,
                verifiedBy: typeof doc.attemptedBy === 'object' ? doc.attemptedBy?.id : doc.attemptedBy,
                environment: doc.environment,
                schemaVersion: doc.schemaVersion,
                playerVersion: doc.playerVersion,
                themeVersion: doc.themeVersion,
                sampleEventIds: doc.sampleEventIds,
              },
            },
          },
          req,
          context: { skipReceiptPointerUpdate: true },
        })

        return doc
      },
    ],
  },
}
