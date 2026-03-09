import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_hero_title_lines_font" AS ENUM('bangers', 'vt323', 'blackHanSans');
  CREATE TYPE "public"."enum_pages_hero_title_lines_color" AS ENUM('white', 'red', 'yellow', 'acid', 'outline-white', 'outline-red');
  CREATE TYPE "public"."enum_pages_hero_title_lines_size" AS ENUM('xl', 'lg', 'md', 'sm');
  CREATE TYPE "public"."enum_pages_hero_title_lines_animation" AS ENUM('none', 'glitch1', 'glitch2', 'shake', 'pulse-red', 'flicker');
  CREATE TYPE "public"."enum__pages_v_version_hero_title_lines_font" AS ENUM('bangers', 'vt323', 'blackHanSans');
  CREATE TYPE "public"."enum__pages_v_version_hero_title_lines_color" AS ENUM('white', 'red', 'yellow', 'acid', 'outline-white', 'outline-red');
  CREATE TYPE "public"."enum__pages_v_version_hero_title_lines_size" AS ENUM('xl', 'lg', 'md', 'sm');
  CREATE TYPE "public"."enum__pages_v_version_hero_title_lines_animation" AS ENUM('none', 'glitch1', 'glitch2', 'shake', 'pulse-red', 'flicker');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'publisher', 'artist');
  CREATE TYPE "public"."enum_artists_social_links_platform" AS ENUM('nostr', 'twitter', 'mastodon', 'instagram', 'youtube', 'bandcamp', 'other');
  CREATE TYPE "public"."enum_artists_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_releases_type" AS ENUM('single', 'album');
  CREATE TYPE "public"."enum_releases_medium" AS ENUM('music', 'video');
  CREATE TYPE "public"."enum_releases_genre" AS ENUM('Alternative', 'Americana/Folk', 'Blues', 'Childrens', 'Christmas', 'Classical', 'Country', 'Dance/Electronic', 'Instrumental', 'Jazz', 'Other', 'Pop', 'R&B/Hip Hop', 'Reggae', 'Rock', 'Soundtrack');
  CREATE TYPE "public"."enum_releases_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_tracks_genre" AS ENUM('Alternative', 'Americana/Folk', 'Blues', 'Childrens', 'Christmas', 'Classical', 'Country', 'Dance/Electronic', 'Instrumental', 'Jazz', 'Other', 'Pop', 'R&B/Hip Hop', 'Reggae', 'Rock', 'Soundtrack');
  CREATE TYPE "public"."enum_value_splits_payment_type" AS ENUM('lightning');
  ALTER TYPE "public"."enum_pages_hero_type" ADD VALUE 'heroEffects' BEFORE 'highImpact';
  ALTER TYPE "public"."enum__pages_v_version_hero_type" ADD VALUE 'heroEffects' BEFORE 'highImpact';
  CREATE TABLE "pages_hero_title_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"font" "enum_pages_hero_title_lines_font" DEFAULT 'bangers',
  	"color" "enum_pages_hero_title_lines_color" DEFAULT 'white',
  	"size" "enum_pages_hero_title_lines_size" DEFAULT 'xl',
  	"animation" "enum_pages_hero_title_lines_animation" DEFAULT 'none',
  	"enable_ghost_layer" boolean DEFAULT false,
  	"rotation" numeric DEFAULT 0
  );
  
  CREATE TABLE "pages_blocks_artist_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"intro_content" jsonb,
  	"limit" numeric DEFAULT 6,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_ticker_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"speed" numeric DEFAULT 12,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_version_hero_title_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"font" "enum__pages_v_version_hero_title_lines_font" DEFAULT 'bangers',
  	"color" "enum__pages_v_version_hero_title_lines_color" DEFAULT 'white',
  	"size" "enum__pages_v_version_hero_title_lines_size" DEFAULT 'xl',
  	"animation" "enum__pages_v_version_hero_title_lines_animation" DEFAULT 'none',
  	"enable_ghost_layer" boolean DEFAULT false,
  	"rotation" numeric DEFAULT 0,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_artist_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro_content" jsonb,
  	"limit" numeric DEFAULT 6,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_ticker_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"speed" numeric DEFAULT 12,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "artists_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_artists_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "artists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"bio" varchar,
  	"website" varchar,
  	"image_id" integer,
  	"lightning_address" varchar,
  	"status" "enum_artists_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "releases_subgenres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "releases_funding_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "releases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_releases_type" NOT NULL,
  	"medium" "enum_releases_medium" DEFAULT 'music',
  	"artist_id" integer NOT NULL,
  	"release_date" timestamp(3) with time zone,
  	"cover_image_id" integer,
  	"banner_image_id" integer,
  	"description" varchar,
  	"explicit" boolean DEFAULT false,
  	"genre" "enum_releases_genre",
  	"feed_locked" boolean DEFAULT false,
  	"license" varchar,
  	"upc" varchar,
  	"location" varchar,
  	"social_url" varchar,
  	"suggested_sats" numeric DEFAULT 5000,
  	"release_guid" varchar,
  	"status" "enum_releases_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tracks_subgenres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "tracks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"release_id" integer NOT NULL,
  	"track_number" numeric NOT NULL,
  	"audio_file_id" integer,
  	"audio_url" varchar,
  	"mime_type" varchar DEFAULT 'audio/mpeg',
  	"file_size" numeric,
  	"duration" numeric,
  	"video_url" varchar,
  	"video_mime_type" varchar DEFAULT 'video/mp4',
  	"video_file_size" numeric,
  	"transcript_url" varchar,
  	"artwork_id" integer,
  	"description" varchar,
  	"explicit" boolean DEFAULT false,
  	"isrc" varchar,
  	"genre" "enum_tracks_genre",
  	"guid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "value_splits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"release_id" integer,
  	"track_id" integer,
  	"recipient_name" varchar NOT NULL,
  	"payment_type" "enum_value_splits_payment_type" DEFAULT 'lightning',
  	"lightning_address" varchar NOT NULL,
  	"percentage" numeric NOT NULL,
  	"role" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audio_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "publishing_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"base_feed_url" varchar,
  	"podcast_title" varchar,
  	"podcast_description" varchar,
  	"language" varchar DEFAULT 'en',
  	"default_copyright" varchar,
  	"default_category" varchar,
  	"default_subcategory" varchar,
  	"owner_name" varchar,
  	"owner_email" varchar,
  	"publisher_name" varchar,
  	"publisher_url" varchar,
  	"default_suggested_sats" numeric DEFAULT 5000,
  	"site_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "pages" ADD COLUMN "hero_pre_heading" varchar;
  ALTER TABLE "pages" ADD COLUMN "hero_badge_enabled" boolean DEFAULT false;
  ALTER TABLE "pages" ADD COLUMN "hero_badge_text" varchar;
  ALTER TABLE "pages" ADD COLUMN "hero_tagline" varchar;
  ALTER TABLE "pages" ADD COLUMN "hero_ghost_text" varchar;
  ALTER TABLE "pages" ADD COLUMN "hero_enable_ornaments" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_pre_heading" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_badge_enabled" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_badge_text" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_tagline" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_ghost_text" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_enable_ornaments" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "artists_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "releases_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tracks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "value_splits_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audio_media_id" integer;
  ALTER TABLE "pages_hero_title_lines" ADD CONSTRAINT "pages_hero_title_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_artist_grid" ADD CONSTRAINT "pages_blocks_artist_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_ticker_items" ADD CONSTRAINT "pages_blocks_ticker_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_ticker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_ticker" ADD CONSTRAINT "pages_blocks_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_title_lines" ADD CONSTRAINT "_pages_v_version_hero_title_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_artist_grid" ADD CONSTRAINT "_pages_v_blocks_artist_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_ticker_items" ADD CONSTRAINT "_pages_v_blocks_ticker_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_ticker"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_ticker" ADD CONSTRAINT "_pages_v_blocks_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists_social_links" ADD CONSTRAINT "artists_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases_subgenres" ADD CONSTRAINT "releases_subgenres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "releases_funding_links" ADD CONSTRAINT "releases_funding_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_banner_image_id_media_id_fk" FOREIGN KEY ("banner_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks_subgenres" ADD CONSTRAINT "tracks_subgenres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_file_id_audio_media_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artwork_id_media_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "value_splits" ADD CONSTRAINT "value_splits_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "value_splits" ADD CONSTRAINT "value_splits_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publishing_settings" ADD CONSTRAINT "publishing_settings_site_image_id_media_id_fk" FOREIGN KEY ("site_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_hero_title_lines_order_idx" ON "pages_hero_title_lines" USING btree ("_order");
  CREATE INDEX "pages_hero_title_lines_parent_id_idx" ON "pages_hero_title_lines" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_artist_grid_order_idx" ON "pages_blocks_artist_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_artist_grid_parent_id_idx" ON "pages_blocks_artist_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_artist_grid_path_idx" ON "pages_blocks_artist_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_ticker_items_order_idx" ON "pages_blocks_ticker_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_ticker_items_parent_id_idx" ON "pages_blocks_ticker_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_ticker_order_idx" ON "pages_blocks_ticker" USING btree ("_order");
  CREATE INDEX "pages_blocks_ticker_parent_id_idx" ON "pages_blocks_ticker" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_ticker_path_idx" ON "pages_blocks_ticker" USING btree ("_path");
  CREATE INDEX "_pages_v_version_hero_title_lines_order_idx" ON "_pages_v_version_hero_title_lines" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_title_lines_parent_id_idx" ON "_pages_v_version_hero_title_lines" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_artist_grid_order_idx" ON "_pages_v_blocks_artist_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_artist_grid_parent_id_idx" ON "_pages_v_blocks_artist_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_artist_grid_path_idx" ON "_pages_v_blocks_artist_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_ticker_items_order_idx" ON "_pages_v_blocks_ticker_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_ticker_items_parent_id_idx" ON "_pages_v_blocks_ticker_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_ticker_order_idx" ON "_pages_v_blocks_ticker" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_ticker_parent_id_idx" ON "_pages_v_blocks_ticker" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_ticker_path_idx" ON "_pages_v_blocks_ticker" USING btree ("_path");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "artists_social_links_order_idx" ON "artists_social_links" USING btree ("_order");
  CREATE INDEX "artists_social_links_parent_id_idx" ON "artists_social_links" USING btree ("_parent_id");
  CREATE INDEX "artists_user_idx" ON "artists" USING btree ("user_id");
  CREATE UNIQUE INDEX "artists_slug_idx" ON "artists" USING btree ("slug");
  CREATE INDEX "artists_image_idx" ON "artists" USING btree ("image_id");
  CREATE INDEX "artists_updated_at_idx" ON "artists" USING btree ("updated_at");
  CREATE INDEX "artists_created_at_idx" ON "artists" USING btree ("created_at");
  CREATE INDEX "releases_subgenres_order_idx" ON "releases_subgenres" USING btree ("_order");
  CREATE INDEX "releases_subgenres_parent_id_idx" ON "releases_subgenres" USING btree ("_parent_id");
  CREATE INDEX "releases_funding_links_order_idx" ON "releases_funding_links" USING btree ("_order");
  CREATE INDEX "releases_funding_links_parent_id_idx" ON "releases_funding_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "releases_slug_idx" ON "releases" USING btree ("slug");
  CREATE INDEX "releases_artist_idx" ON "releases" USING btree ("artist_id");
  CREATE INDEX "releases_cover_image_idx" ON "releases" USING btree ("cover_image_id");
  CREATE INDEX "releases_banner_image_idx" ON "releases" USING btree ("banner_image_id");
  CREATE UNIQUE INDEX "releases_release_guid_idx" ON "releases" USING btree ("release_guid");
  CREATE INDEX "releases_updated_at_idx" ON "releases" USING btree ("updated_at");
  CREATE INDEX "releases_created_at_idx" ON "releases" USING btree ("created_at");
  CREATE INDEX "tracks_subgenres_order_idx" ON "tracks_subgenres" USING btree ("_order");
  CREATE INDEX "tracks_subgenres_parent_id_idx" ON "tracks_subgenres" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tracks_slug_idx" ON "tracks" USING btree ("slug");
  CREATE INDEX "tracks_release_idx" ON "tracks" USING btree ("release_id");
  CREATE INDEX "tracks_audio_file_idx" ON "tracks" USING btree ("audio_file_id");
  CREATE INDEX "tracks_artwork_idx" ON "tracks" USING btree ("artwork_id");
  CREATE UNIQUE INDEX "tracks_guid_idx" ON "tracks" USING btree ("guid");
  CREATE INDEX "tracks_updated_at_idx" ON "tracks" USING btree ("updated_at");
  CREATE INDEX "tracks_created_at_idx" ON "tracks" USING btree ("created_at");
  CREATE INDEX "value_splits_release_idx" ON "value_splits" USING btree ("release_id");
  CREATE INDEX "value_splits_track_idx" ON "value_splits" USING btree ("track_id");
  CREATE INDEX "value_splits_updated_at_idx" ON "value_splits" USING btree ("updated_at");
  CREATE INDEX "value_splits_created_at_idx" ON "value_splits" USING btree ("created_at");
  CREATE INDEX "audio_media_updated_at_idx" ON "audio_media" USING btree ("updated_at");
  CREATE INDEX "audio_media_created_at_idx" ON "audio_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "audio_media_filename_idx" ON "audio_media" USING btree ("filename");
  CREATE INDEX "publishing_settings_site_image_idx" ON "publishing_settings" USING btree ("site_image_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_releases_fk" FOREIGN KEY ("releases_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracks_fk" FOREIGN KEY ("tracks_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_value_splits_fk" FOREIGN KEY ("value_splits_id") REFERENCES "public"."value_splits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_media_fk" FOREIGN KEY ("audio_media_id") REFERENCES "public"."audio_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_artists_id_idx" ON "payload_locked_documents_rels" USING btree ("artists_id");
  CREATE INDEX "payload_locked_documents_rels_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("releases_id");
  CREATE INDEX "payload_locked_documents_rels_tracks_id_idx" ON "payload_locked_documents_rels" USING btree ("tracks_id");
  CREATE INDEX "payload_locked_documents_rels_value_splits_id_idx" ON "payload_locked_documents_rels" USING btree ("value_splits_id");
  CREATE INDEX "payload_locked_documents_rels_audio_media_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_hero_title_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_artist_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_ticker_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_ticker" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_hero_title_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_artist_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_ticker_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_ticker" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "artists_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "artists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "releases_subgenres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "releases_funding_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "releases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tracks_subgenres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tracks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "value_splits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audio_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "publishing_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_hero_title_lines" CASCADE;
  DROP TABLE "pages_blocks_artist_grid" CASCADE;
  DROP TABLE "pages_blocks_ticker_items" CASCADE;
  DROP TABLE "pages_blocks_ticker" CASCADE;
  DROP TABLE "_pages_v_version_hero_title_lines" CASCADE;
  DROP TABLE "_pages_v_blocks_artist_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_ticker_items" CASCADE;
  DROP TABLE "_pages_v_blocks_ticker" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "artists_social_links" CASCADE;
  DROP TABLE "artists" CASCADE;
  DROP TABLE "releases_subgenres" CASCADE;
  DROP TABLE "releases_funding_links" CASCADE;
  DROP TABLE "releases" CASCADE;
  DROP TABLE "tracks_subgenres" CASCADE;
  DROP TABLE "tracks" CASCADE;
  DROP TABLE "value_splits" CASCADE;
  DROP TABLE "audio_media" CASCADE;
  DROP TABLE "publishing_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_artists_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_releases_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tracks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_value_splits_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audio_media_fk";
  
  ALTER TABLE "pages" ALTER COLUMN "hero_type" SET DATA TYPE text;
  ALTER TABLE "pages" ALTER COLUMN "hero_type" SET DEFAULT 'lowImpact'::text;
  DROP TYPE "public"."enum_pages_hero_type";
  CREATE TYPE "public"."enum_pages_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  ALTER TABLE "pages" ALTER COLUMN "hero_type" SET DEFAULT 'lowImpact'::"public"."enum_pages_hero_type";
  ALTER TABLE "pages" ALTER COLUMN "hero_type" SET DATA TYPE "public"."enum_pages_hero_type" USING "hero_type"::"public"."enum_pages_hero_type";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_hero_type" SET DATA TYPE text;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_hero_type" SET DEFAULT 'lowImpact'::text;
  DROP TYPE "public"."enum__pages_v_version_hero_type";
  CREATE TYPE "public"."enum__pages_v_version_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  ALTER TABLE "_pages_v" ALTER COLUMN "version_hero_type" SET DEFAULT 'lowImpact'::"public"."enum__pages_v_version_hero_type";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_hero_type" SET DATA TYPE "public"."enum__pages_v_version_hero_type" USING "version_hero_type"::"public"."enum__pages_v_version_hero_type";
  DROP INDEX "payload_locked_documents_rels_artists_id_idx";
  DROP INDEX "payload_locked_documents_rels_releases_id_idx";
  DROP INDEX "payload_locked_documents_rels_tracks_id_idx";
  DROP INDEX "payload_locked_documents_rels_value_splits_id_idx";
  DROP INDEX "payload_locked_documents_rels_audio_media_id_idx";
  ALTER TABLE "pages" DROP COLUMN "hero_pre_heading";
  ALTER TABLE "pages" DROP COLUMN "hero_badge_enabled";
  ALTER TABLE "pages" DROP COLUMN "hero_badge_text";
  ALTER TABLE "pages" DROP COLUMN "hero_tagline";
  ALTER TABLE "pages" DROP COLUMN "hero_ghost_text";
  ALTER TABLE "pages" DROP COLUMN "hero_enable_ornaments";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_pre_heading";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_badge_enabled";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_badge_text";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_tagline";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_ghost_text";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_enable_ornaments";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "artists_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "releases_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tracks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "value_splits_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audio_media_id";
  DROP TYPE "public"."enum_pages_hero_title_lines_font";
  DROP TYPE "public"."enum_pages_hero_title_lines_color";
  DROP TYPE "public"."enum_pages_hero_title_lines_size";
  DROP TYPE "public"."enum_pages_hero_title_lines_animation";
  DROP TYPE "public"."enum__pages_v_version_hero_title_lines_font";
  DROP TYPE "public"."enum__pages_v_version_hero_title_lines_color";
  DROP TYPE "public"."enum__pages_v_version_hero_title_lines_size";
  DROP TYPE "public"."enum__pages_v_version_hero_title_lines_animation";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_artists_social_links_platform";
  DROP TYPE "public"."enum_artists_status";
  DROP TYPE "public"."enum_releases_type";
  DROP TYPE "public"."enum_releases_medium";
  DROP TYPE "public"."enum_releases_genre";
  DROP TYPE "public"."enum_releases_status";
  DROP TYPE "public"."enum_tracks_genre";
  DROP TYPE "public"."enum_value_splits_payment_type";`)
}
