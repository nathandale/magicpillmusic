import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'
import { isAdmin, isPublisher } from './roles'

/**
 * Release workflow state machine (EO §7.5) and the DEMU role-gating decision Nathan
 * approved on 2026-09-17: no new `editor` role. Any authenticated user may prepare
 * drafts (unchanged from the collections' existing `create`/`update: authenticated`).
 * Advancing past `draft` requires `publisher` or `admin`. Advancing specifically into
 * `scheduled` or `published` — final publication — requires `admin`.
 */
export const RELEASE_WORKFLOW_STATES = [
  'draft',
  'media_ready',
  'player_previewed',
  'shadow_ready',
  'analytics_verified',
  'scheduled',
  'published',
  'archived',
] as const

export type ReleaseWorkflowState = (typeof RELEASE_WORKFLOW_STATES)[number]

export const RELEASE_WORKFLOW_STATE_OPTIONS: { label: string; value: ReleaseWorkflowState }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Media ready', value: 'media_ready' },
  { label: 'Player previewed', value: 'player_previewed' },
  { label: 'SHADOW ready', value: 'shadow_ready' },
  { label: 'Analytics verified', value: 'analytics_verified' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
]

/** Final-publication states — admin-gated specifically, per decision 2. */
export const FINAL_PUBLICATION_STATES: ReadonlySet<ReleaseWorkflowState> = new Set(['scheduled', 'published'])

/**
 * Track readiness (decision 5, 2026-09-17): deliberately smaller than the Release's
 * workflow — no scheduling/publication values. A track reaching `preview_verified`
 * says the track's own data/audio is ready; it says nothing about public visibility,
 * which remains entirely the parent Release's decision.
 */
export const TRACK_READINESS_STATES = ['draft', 'media_ready', 'preview_verified'] as const

export type TrackReadiness = (typeof TRACK_READINESS_STATES)[number]

export const TRACK_READINESS_OPTIONS: { label: string; value: TrackReadiness }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Media ready', value: 'media_ready' },
  { label: 'Preview verified', value: 'preview_verified' },
]

/**
 * Field-level access for Releases.workflowState — enforced on BOTH create and
 * update. `doc` is undefined on create, so `currentValue` defaults to `'draft'`
 * (the field's own default) either way. This is deliberately NOT short-circuited
 * for create: a request that tries to `create` a release with `workflowState:
 * 'published'` directly (skipping every earlier state) must be gated exactly the
 * same as an update attempting that same jump, or role-gating on this field is
 * fiction — a prior version of this function returned `true` unconditionally
 * whenever `doc` was undefined, which let any authenticated user create a
 * pre-published release. Field access only ever returns a boolean (no query
 * constraints), which is exactly what a single-field gate needs.
 */
export const workflowStateFieldAccess: FieldAccess = ({ req: { user }, siblingData, doc }) => {
  const nextValue = siblingData?.workflowState as ReleaseWorkflowState | undefined
  const currentValue = (doc?.workflowState as ReleaseWorkflowState | undefined) ?? 'draft'

  if (nextValue === undefined || nextValue === currentValue) return true // not being changed

  const typedUser = user as User | null

  if (isAdmin(typedUser)) return true
  if (FINAL_PUBLICATION_STATES.has(nextValue)) return false // scheduled/published: admin-only
  return isPublisher(typedUser) // any other transition: publisher or admin
}

/**
 * Field-level access for Tracks.trackReadiness. Same create-and-update reasoning
 * as `workflowStateFieldAccess` above. No final-publication tier exists here
 * (decision 5) — any advance beyond the create-time default requires publisher/
 * admin.
 */
export const trackReadinessFieldAccess: FieldAccess = ({ req: { user }, siblingData, doc }) => {
  const nextValue = siblingData?.trackReadiness as TrackReadiness | undefined
  const currentValue = (doc?.trackReadiness as TrackReadiness | undefined) ?? 'draft'

  if (nextValue === undefined || nextValue === currentValue) return true

  return isPublisher(user as User | null)
}

/**
 * For fields that must be computed by server-side hook logic only — GUIDs, share
 * IDs, preview attestations, analytics-verification pointers/summaries, audit
 * timestamps. `admin.readOnly` only hides a field in the admin UI; it does not
 * stop a direct REST/GraphQL/Local-API-with-overrideAccess:false request from
 * setting it. This is the actual enforcement: Payload strips any client-submitted
 * value for a field whose `access.create`/`access.update` returns false, before
 * hooks run — but a `beforeChange` hook itself writes directly to the `data`
 * object it returns, which is not subject to this same access check, so
 * server-computed values still land correctly.
 */
export const serverControlledFieldAccess: FieldAccess = () => false

/**
 * Collection-level `read` access for Releases/Tracks now that both have Payload
 * drafts enabled. Authenticated staff see everything (drafts included, for editing);
 * anonymous/public reads (the feed routes call through Payload's Local API with an
 * explicit user context, but any direct REST/GraphQL caller does not) only ever see
 * published documents. This is what makes "draft enablement must never expose draft
 * Releases or Tracks to anonymous/public reads" true rather than aspirational.
 */
export const readPublishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}
