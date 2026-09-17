// DEMUPUB — append-only PostHog verification history (ND-MR-001, decision 4)
import type { Access, CollectionConfig } from 'payload'

import { isPublisher } from '../access/roles'
import { serverControlledFieldAccess } from '../access/workflowTransitions'
import type { User } from '@/payload-types'

/**
 * Every attempt at the EO §15 PostHog publishing gate is recorded here permanently —
 * pass or fail, never edited or deleted afterward. This is what makes it genuinely
 * "append-only": the access control below disallows `update` and `delete` entirely,
 * for every role including admin. A bad or superseded attempt is superseded by a new
 * attempt, not corrected in place.
 *
 * Workstream 1A ships this data model only. A genuine `pass` receipt requires a
 * "trusted verification run" context (`req.context.trustedVerificationRun === true`)
 * that only internal, non-HTTP-reachable server code can set on a Local API call —
 * no REST/GraphQL request body can ever populate Payload's `context`, and nothing
 * shipped in Workstream 1A sets that flag anywhere. That makes a genuine pass
 * impossible to obtain through any externally reachable path today, by construction,
 * not by convention. Staff may still log a manual `fail` record for their own
 * audit trail (e.g. "tried in production, broke on Safari") without that gate,
 * since a fail can't be used to bypass anything.
 */
const disallow: Access = () => false

export const AnalyticsVerificationReceipts: CollectionConfig = {
  slug: 'analytics-verification-receipts',
  // Short dbName: the slug (API route, `relationTo` references) stays fully
  // descriptive, but is long enough that Postgres FK constraint names combining it
  // with the referencing column on Releases exceeded the 63-character identifier
  // limit (hit in practice generating this migration against a scratch database —
  // see the Workstream 1A completion report).
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
    // --- Server-controlled identity/timestamp fields ---
    // `admin.readOnly` alone only hides these in the admin UI; it does not stop a
    // direct REST/GraphQL/Local-API-with-overrideAccess:false write. These also
    // carry real field-level access (create/update always false), so a client can
    // never submit a value for them — only this collection's own beforeChange hook
    // computes them, from trusted server-side inputs (req.user, Date.now(), and —
    // for the snapshot fields — the release/track state the trusted caller passed
    // in as data, which is itself gated by the trustedVerificationRun context below
    // for a `pass` outcome).
    {
      name: 'attemptedAt',
      type: 'date',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: { readOnly: true },
    },
    {
      name: 'attemptedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
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
    // --- Snapshot of the exact production configuration this attempt verified ---
    // Checked by the publish-validation hook (condition 19) against the release's
    // *current* state — a receipt that doesn't match on every one of these is
    // treated as not applicable, not as "close enough."
    {
      name: 'releaseGuid',
      type: 'text',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: { readOnly: true, description: 'Snapshot of the release GUID at the moment of this attempt.' },
    },
    {
      name: 'trackFingerprint',
      type: 'text',
      access: { create: serverControlledFieldAccess, update: serverControlledFieldAccess },
      admin: { readOnly: true, description: 'Snapshot of the track-set fingerprint (src/lib/trackFingerprint.ts) at the moment of this attempt.' },
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
      ({ data, operation, req }) => {
        if (operation !== 'create' || !data) return data

        // Server-set, unconditionally — never trust a client-submitted value for
        // these, even from an authenticated publisher.
        data.attemptedAt = new Date().toISOString()
        data.attemptedBy = req.user?.id ?? null

        // The one real security gate in this collection: a `pass` outcome can only
        // be created by a Local API call that explicitly sets
        // `context.trustedVerificationRun = true`. No HTTP request (REST or
        // GraphQL) can ever populate Payload's `context` — it exists only for
        // server-side/hook-to-hook calls — and nothing in Workstream 1A's own code
        // sets this flag anywhere reachable. Until Workstream 1B wires a genuine
        // MYRADIO/PostHog verification runner to call this with that context, a
        // passing receipt is architecturally impossible to create, not merely
        // discouraged.
        if (data.outcome === 'pass' && req.context?.trustedVerificationRun !== true) {
          throw new Error(
            'A passing analytics-verification receipt can only be created by the trusted verification runner (Workstream 1B), not directly. Log a "fail" outcome if you need to record a manual attempt.',
          )
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
          context: { skipReceiptPointerUpdate: true, skipPublicationStateManagement: true },
          depth: 0,
        })

        return doc
      },
    ],
  },
}
