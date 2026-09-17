import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "avr" ADD COLUMN "release_guid" varchar;
  ALTER TABLE "avr" ADD COLUMN "track_fingerprint" varchar;`)

  // --- Data backfill: grandfather legacy published releases into the now-strict
  // publication gate (review round 2). Public feed routes now require
  // _status='published' AND workflowState='published' AND publicVisibility='public'
  // — all three defaulted to 'draft'/'preview' for every pre-existing row when
  // their columns were added in the prior migration (Postgres backfills a new
  // column's DEFAULT into existing rows immediately, it does not leave them NULL —
  // see that migration's own note). Without this, every release that was already
  // live under the old system would silently vanish from the public feed the
  // moment this branch ships, which is exactly the compatibility break Workstream
  // 1A was required to avoid.
  //
  // This is a one-time, intentionally narrow grandfather clause, not a general
  // bypass: it only ever fires for rows where the *legacy* `status` column already
  // said 'published' before this migration ran. Every release published from here
  // forward reaches workflowState='published' only through the real validation
  // gate (src/hooks/validatePublishTransition.ts).
  //
  // Tracks: only backfilled to _status='published' when their PARENT release was
  // already published — a track under a still-draft release stays _status='draft'
  // (the column's own default), which is a deliberate tightening, not a gap: Tracks
  // previously had `read: anyone` with no gating at all, so every track — including
  // ones under draft releases — was already fully publicly readable via the plain
  // REST/GraphQL API before Workstream 1A touched anything. Backfilling every track
  // unconditionally would undo the exact protection 1A's access-control change was
  // meant to add for in-progress work.
  await db.execute(sql`
    UPDATE "releases"
    SET "_status" = 'published', "workflow_state" = 'published'
    WHERE "status" = 'published';

    UPDATE "tracks"
    SET "_status" = 'published'
    WHERE "release_id" IN (SELECT "id" FROM "releases" WHERE "status" = 'published');
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "avr" DROP COLUMN "release_guid";
  ALTER TABLE "avr" DROP COLUMN "track_fingerprint";`)

  // The backfill above is not safely reversible in general: once this migration
  // has run, new releases published for real (through the actual validation gate)
  // are indistinguishable from grandfathered legacy ones by looking at `status`
  // alone — both simply read 'published'. Reverting rows here could un-publish
  // genuine, validly-published releases created after this migration ran. This is
  // a documented, intentional limitation of this specific data backfill, not an
  // oversight — see the equivalent note on the prior migration's backfill.
}
