import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tracks_credits_role" AS ENUM('writer', 'composer', 'performer', 'producer', 'featured', 'engineer', 'other');
  CREATE TABLE "tracks_credits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_tracks_credits_role" DEFAULT 'performer' NOT NULL,
  	"name" varchar NOT NULL,
  	"role_label" varchar,
  	"url" varchar
  );
  
  ALTER TABLE "tracks" ADD COLUMN "story" varchar;
  ALTER TABLE "tracks_credits" ADD CONSTRAINT "tracks_credits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tracks_credits_order_idx" ON "tracks_credits" USING btree ("_order");
  CREATE INDEX "tracks_credits_parent_id_idx" ON "tracks_credits" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "tracks_credits" CASCADE;
  ALTER TABLE "tracks" DROP COLUMN "story";
  DROP TYPE "public"."enum_tracks_credits_role";`)
}
