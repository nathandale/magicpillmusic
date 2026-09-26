import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_releases_share_card_layout" AS ENUM('broadcast', 'poster', 'terrestrial', 'image');
  CREATE TYPE "public"."enum_releases_share_card_show_wordmark" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum__releases_v_version_share_card_layout" AS ENUM('broadcast', 'poster', 'terrestrial', 'image');
  CREATE TYPE "public"."enum__releases_v_version_share_card_show_wordmark" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_tracks_share_card_layout" AS ENUM('broadcast', 'poster', 'terrestrial', 'image');
  CREATE TYPE "public"."enum_tracks_share_card_show_wordmark" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum__tracks_v_version_share_card_layout" AS ENUM('broadcast', 'poster', 'terrestrial', 'image');
  CREATE TYPE "public"."enum__tracks_v_version_share_card_show_wordmark" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_myradio_settings_site_card_layout" AS ENUM('broadcast', 'poster', 'terrestrial', 'image');
  CREATE TYPE "public"."enum_myradio_settings_site_card_show_wordmark" AS ENUM('show', 'hide');
  CREATE TABLE "myradio_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_card_layout" "enum_myradio_settings_site_card_layout" DEFAULT 'terrestrial',
  	"site_card_kicker" varchar,
  	"site_card_accent_color" varchar DEFAULT '#db495a',
  	"site_card_headline" varchar DEFAULT 'MY RADIO',
  	"site_card_subline" varchar DEFAULT 'NATHAN DALE',
  	"site_card_show_wordmark" "enum_myradio_settings_site_card_show_wordmark" DEFAULT 'show',
  	"site_card_background_id" integer,
  	"site_card_image_id" integer,
  	"site_card_link_title" varchar,
  	"site_card_link_description" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "releases" ADD COLUMN "share_card_layout" "enum_releases_share_card_layout" DEFAULT 'broadcast';
  ALTER TABLE "releases" ADD COLUMN "share_card_kicker" varchar;
  ALTER TABLE "releases" ADD COLUMN "share_card_accent_color" varchar DEFAULT '#db495a';
  ALTER TABLE "releases" ADD COLUMN "share_card_headline" varchar DEFAULT '{track}';
  ALTER TABLE "releases" ADD COLUMN "share_card_subline" varchar DEFAULT '{artist}';
  ALTER TABLE "releases" ADD COLUMN "share_card_show_wordmark" "enum_releases_share_card_show_wordmark" DEFAULT 'show';
  ALTER TABLE "releases" ADD COLUMN "share_card_artwork_id" integer;
  ALTER TABLE "releases" ADD COLUMN "share_card_background_id" integer;
  ALTER TABLE "releases" ADD COLUMN "share_card_image_id" integer;
  ALTER TABLE "releases" ADD COLUMN "share_card_link_title" varchar;
  ALTER TABLE "releases" ADD COLUMN "share_card_link_description" varchar;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_layout" "enum__releases_v_version_share_card_layout" DEFAULT 'broadcast';
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_kicker" varchar;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_accent_color" varchar DEFAULT '#db495a';
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_headline" varchar DEFAULT '{track}';
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_subline" varchar DEFAULT '{artist}';
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_show_wordmark" "enum__releases_v_version_share_card_show_wordmark" DEFAULT 'show';
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_artwork_id" integer;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_background_id" integer;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_image_id" integer;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_link_title" varchar;
  ALTER TABLE "_releases_v" ADD COLUMN "version_share_card_link_description" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_use_release_default" boolean DEFAULT true;
  ALTER TABLE "tracks" ADD COLUMN "share_card_layout" "enum_tracks_share_card_layout";
  ALTER TABLE "tracks" ADD COLUMN "share_card_kicker" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_accent_color" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_headline" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_subline" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_show_wordmark" "enum_tracks_share_card_show_wordmark";
  ALTER TABLE "tracks" ADD COLUMN "share_card_artwork_id" integer;
  ALTER TABLE "tracks" ADD COLUMN "share_card_background_id" integer;
  ALTER TABLE "tracks" ADD COLUMN "share_card_image_id" integer;
  ALTER TABLE "tracks" ADD COLUMN "share_card_link_title" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_card_link_description" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_use_release_default" boolean DEFAULT true;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_layout" "enum__tracks_v_version_share_card_layout";
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_kicker" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_accent_color" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_headline" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_subline" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_show_wordmark" "enum__tracks_v_version_share_card_show_wordmark";
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_artwork_id" integer;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_background_id" integer;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_image_id" integer;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_link_title" varchar;
  ALTER TABLE "_tracks_v" ADD COLUMN "version_share_card_link_description" varchar;
  ALTER TABLE "myradio_settings" ADD CONSTRAINT "myradio_settings_site_card_background_id_media_id_fk" FOREIGN KEY ("site_card_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "myradio_settings" ADD CONSTRAINT "myradio_settings_site_card_image_id_media_id_fk" FOREIGN KEY ("site_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "myradio_settings_site_card_site_card_background_idx" ON "myradio_settings" USING btree ("site_card_background_id");
  CREATE INDEX "myradio_settings_site_card_site_card_image_idx" ON "myradio_settings" USING btree ("site_card_image_id");
  ALTER TABLE "releases" ADD CONSTRAINT "releases_share_card_artwork_id_media_id_fk" FOREIGN KEY ("share_card_artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_share_card_background_id_media_id_fk" FOREIGN KEY ("share_card_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_share_card_image_id_media_id_fk" FOREIGN KEY ("share_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_share_card_artwork_id_media_id_fk" FOREIGN KEY ("version_share_card_artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_share_card_background_id_media_id_fk" FOREIGN KEY ("version_share_card_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_share_card_image_id_media_id_fk" FOREIGN KEY ("version_share_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_share_card_artwork_id_media_id_fk" FOREIGN KEY ("share_card_artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_share_card_background_id_media_id_fk" FOREIGN KEY ("share_card_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_share_card_image_id_media_id_fk" FOREIGN KEY ("share_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_share_card_artwork_id_media_id_fk" FOREIGN KEY ("version_share_card_artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_share_card_background_id_media_id_fk" FOREIGN KEY ("version_share_card_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_share_card_image_id_media_id_fk" FOREIGN KEY ("version_share_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "releases_share_card_share_card_artwork_idx" ON "releases" USING btree ("share_card_artwork_id");
  CREATE INDEX "releases_share_card_share_card_background_idx" ON "releases" USING btree ("share_card_background_id");
  CREATE INDEX "releases_share_card_share_card_image_idx" ON "releases" USING btree ("share_card_image_id");
  CREATE INDEX "_releases_v_version_share_card_version_share_card_artwor_idx" ON "_releases_v" USING btree ("version_share_card_artwork_id");
  CREATE INDEX "_releases_v_version_share_card_version_share_card_backgr_idx" ON "_releases_v" USING btree ("version_share_card_background_id");
  CREATE INDEX "_releases_v_version_share_card_version_share_card_image_idx" ON "_releases_v" USING btree ("version_share_card_image_id");
  CREATE INDEX "tracks_share_card_share_card_artwork_idx" ON "tracks" USING btree ("share_card_artwork_id");
  CREATE INDEX "tracks_share_card_share_card_background_idx" ON "tracks" USING btree ("share_card_background_id");
  CREATE INDEX "tracks_share_card_share_card_image_idx" ON "tracks" USING btree ("share_card_image_id");
  CREATE INDEX "_tracks_v_version_share_card_version_share_card_artwork_idx" ON "_tracks_v" USING btree ("version_share_card_artwork_id");
  CREATE INDEX "_tracks_v_version_share_card_version_share_card_backgrou_idx" ON "_tracks_v" USING btree ("version_share_card_background_id");
  CREATE INDEX "_tracks_v_version_share_card_version_share_card_image_idx" ON "_tracks_v" USING btree ("version_share_card_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "myradio_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "myradio_settings" CASCADE;
  ALTER TABLE "releases" DROP CONSTRAINT "releases_share_card_artwork_id_media_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_share_card_background_id_media_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_share_card_image_id_media_id_fk";
  
  ALTER TABLE "_releases_v" DROP CONSTRAINT "_releases_v_version_share_card_artwork_id_media_id_fk";
  
  ALTER TABLE "_releases_v" DROP CONSTRAINT "_releases_v_version_share_card_background_id_media_id_fk";
  
  ALTER TABLE "_releases_v" DROP CONSTRAINT "_releases_v_version_share_card_image_id_media_id_fk";
  
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_share_card_artwork_id_media_id_fk";
  
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_share_card_background_id_media_id_fk";
  
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_share_card_image_id_media_id_fk";
  
  ALTER TABLE "_tracks_v" DROP CONSTRAINT "_tracks_v_version_share_card_artwork_id_media_id_fk";
  
  ALTER TABLE "_tracks_v" DROP CONSTRAINT "_tracks_v_version_share_card_background_id_media_id_fk";
  
  ALTER TABLE "_tracks_v" DROP CONSTRAINT "_tracks_v_version_share_card_image_id_media_id_fk";
  
  DROP INDEX "releases_share_card_share_card_artwork_idx";
  DROP INDEX "releases_share_card_share_card_background_idx";
  DROP INDEX "releases_share_card_share_card_image_idx";
  DROP INDEX "_releases_v_version_share_card_version_share_card_artwor_idx";
  DROP INDEX "_releases_v_version_share_card_version_share_card_backgr_idx";
  DROP INDEX "_releases_v_version_share_card_version_share_card_image_idx";
  DROP INDEX "tracks_share_card_share_card_artwork_idx";
  DROP INDEX "tracks_share_card_share_card_background_idx";
  DROP INDEX "tracks_share_card_share_card_image_idx";
  DROP INDEX "_tracks_v_version_share_card_version_share_card_artwork_idx";
  DROP INDEX "_tracks_v_version_share_card_version_share_card_backgrou_idx";
  DROP INDEX "_tracks_v_version_share_card_version_share_card_image_idx";
  ALTER TABLE "releases" DROP COLUMN "share_card_layout";
  ALTER TABLE "releases" DROP COLUMN "share_card_kicker";
  ALTER TABLE "releases" DROP COLUMN "share_card_accent_color";
  ALTER TABLE "releases" DROP COLUMN "share_card_headline";
  ALTER TABLE "releases" DROP COLUMN "share_card_subline";
  ALTER TABLE "releases" DROP COLUMN "share_card_show_wordmark";
  ALTER TABLE "releases" DROP COLUMN "share_card_artwork_id";
  ALTER TABLE "releases" DROP COLUMN "share_card_background_id";
  ALTER TABLE "releases" DROP COLUMN "share_card_image_id";
  ALTER TABLE "releases" DROP COLUMN "share_card_link_title";
  ALTER TABLE "releases" DROP COLUMN "share_card_link_description";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_layout";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_kicker";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_accent_color";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_headline";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_subline";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_show_wordmark";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_artwork_id";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_background_id";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_image_id";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_link_title";
  ALTER TABLE "_releases_v" DROP COLUMN "version_share_card_link_description";
  ALTER TABLE "tracks" DROP COLUMN "share_card_use_release_default";
  ALTER TABLE "tracks" DROP COLUMN "share_card_layout";
  ALTER TABLE "tracks" DROP COLUMN "share_card_kicker";
  ALTER TABLE "tracks" DROP COLUMN "share_card_accent_color";
  ALTER TABLE "tracks" DROP COLUMN "share_card_headline";
  ALTER TABLE "tracks" DROP COLUMN "share_card_subline";
  ALTER TABLE "tracks" DROP COLUMN "share_card_show_wordmark";
  ALTER TABLE "tracks" DROP COLUMN "share_card_artwork_id";
  ALTER TABLE "tracks" DROP COLUMN "share_card_background_id";
  ALTER TABLE "tracks" DROP COLUMN "share_card_image_id";
  ALTER TABLE "tracks" DROP COLUMN "share_card_link_title";
  ALTER TABLE "tracks" DROP COLUMN "share_card_link_description";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_use_release_default";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_layout";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_kicker";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_accent_color";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_headline";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_subline";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_show_wordmark";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_artwork_id";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_background_id";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_image_id";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_link_title";
  ALTER TABLE "_tracks_v" DROP COLUMN "version_share_card_link_description";
  DROP TYPE "public"."enum_releases_share_card_layout";
  DROP TYPE "public"."enum_releases_share_card_show_wordmark";
  DROP TYPE "public"."enum__releases_v_version_share_card_layout";
  DROP TYPE "public"."enum__releases_v_version_share_card_show_wordmark";
  DROP TYPE "public"."enum_tracks_share_card_layout";
  DROP TYPE "public"."enum_tracks_share_card_show_wordmark";
  DROP TYPE "public"."enum__tracks_v_version_share_card_layout";
  DROP TYPE "public"."enum__tracks_v_version_share_card_show_wordmark";
  DROP TYPE "public"."enum_myradio_settings_site_card_layout";
  DROP TYPE "public"."enum_myradio_settings_site_card_show_wordmark";`)
}
