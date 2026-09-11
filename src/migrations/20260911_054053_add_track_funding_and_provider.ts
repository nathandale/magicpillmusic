import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_releases_funding_links_provider" AS ENUM('cashapp', 'venmo', 'paypal', 'buymeacoffee', 'kofi', 'lightning', 'other');
  CREATE TYPE "public"."enum_tracks_funding_links_provider" AS ENUM('cashapp', 'venmo', 'paypal', 'buymeacoffee', 'kofi', 'lightning', 'other');
  CREATE TABLE "tracks_funding_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"provider" "enum_tracks_funding_links_provider" DEFAULT 'other' NOT NULL,
  	"label" varchar,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "releases_funding_links" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "releases_funding_links" ADD COLUMN "provider" "enum_releases_funding_links_provider" DEFAULT 'other' NOT NULL;
  ALTER TABLE "tracks_funding_links" ADD CONSTRAINT "tracks_funding_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tracks_funding_links_order_idx" ON "tracks_funding_links" USING btree ("_order");
  CREATE INDEX "tracks_funding_links_parent_id_idx" ON "tracks_funding_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tracks_funding_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tracks_funding_links" CASCADE;
  ALTER TABLE "releases_funding_links" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "releases_funding_links" DROP COLUMN "provider";
  DROP TYPE "public"."enum_releases_funding_links_provider";
  DROP TYPE "public"."enum_tracks_funding_links_provider";`)
}
