import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."mr_artwork_treatment" AS ENUM('full', 'crop', 'framed');
  CREATE TYPE "public"."mr_type_treatment" AS ENUM('default', 'display', 'mono');
  CREATE TYPE "public"."mr_surface_treatment" AS ENUM('solid', 'gradient', 'image', 'image-gradient');
  CREATE TYPE "public"."mr_theme_motion" AS ENUM('none', 'subtle');
  CREATE TYPE "public"."mr_signal_card_layout" AS ENUM('standard', 'broadcast', 'archival', 'minimal');
  CREATE TYPE "public"."mr_social_card_layout" AS ENUM('standard', 'minimal');
  CREATE TYPE "public"."enum_releases_distribution_release_lane" AS ENUM('current', 'archive', 'catalog');
  CREATE TYPE "public"."enum_releases_distribution_public_visibility" AS ENUM('preview', 'public', 'archived');
  CREATE TYPE "public"."enum_releases_distribution_default_share_target" AS ENUM('story', 'song');
  CREATE TYPE "public"."enum_releases_workflow_state" AS ENUM('draft', 'media_ready', 'player_previewed', 'shadow_ready', 'analytics_verified', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__releases_v_version_funding_links_provider" AS ENUM('cashapp', 'venmo', 'paypal', 'buymeacoffee', 'kofi', 'lightning', 'other');
  CREATE TYPE "public"."enum__releases_v_version_type" AS ENUM('single', 'album');
  CREATE TYPE "public"."enum__releases_v_version_medium" AS ENUM('music', 'video');
  CREATE TYPE "public"."enum__releases_v_version_genre" AS ENUM('Alternative', 'Americana/Folk', 'Blues', 'Childrens', 'Christmas', 'Classical', 'Country', 'Dance/Electronic', 'Instrumental', 'Jazz', 'Other', 'Pop', 'R&B/Hip Hop', 'Reggae', 'Rock', 'Soundtrack');
  CREATE TYPE "public"."enum__releases_v_version_myradio_theme" AS ENUM('catalog', 'terrestrial', 'nathan-archive', 'wooden-revolt', 'parade', 'monochrome');
  CREATE TYPE "public"."enum__releases_v_version_distribution_release_lane" AS ENUM('current', 'archive', 'catalog');
  CREATE TYPE "public"."enum__releases_v_version_distribution_public_visibility" AS ENUM('preview', 'public', 'archived');
  CREATE TYPE "public"."enum__releases_v_version_distribution_default_share_target" AS ENUM('story', 'song');
  CREATE TYPE "public"."enum__releases_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__releases_v_version_workflow_state" AS ENUM('draft', 'media_ready', 'player_previewed', 'shadow_ready', 'analytics_verified', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_tracks_lyrics_status" AS ENUM('missing', 'draft', 'verified', 'not_applicable');
  CREATE TYPE "public"."enum_tracks_track_readiness" AS ENUM('draft', 'media_ready', 'preview_verified');
  CREATE TYPE "public"."enum_tracks_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tracks_v_version_funding_links_provider" AS ENUM('cashapp', 'venmo', 'paypal', 'buymeacoffee', 'kofi', 'lightning', 'other');
  CREATE TYPE "public"."enum__tracks_v_version_genre" AS ENUM('Alternative', 'Americana/Folk', 'Blues', 'Childrens', 'Christmas', 'Classical', 'Country', 'Dance/Electronic', 'Instrumental', 'Jazz', 'Other', 'Pop', 'R&B/Hip Hop', 'Reggae', 'Rock', 'Soundtrack');
  CREATE TYPE "public"."enum__tracks_v_version_lyrics_status" AS ENUM('missing', 'draft', 'verified', 'not_applicable');
  CREATE TYPE "public"."enum__tracks_v_version_track_readiness" AS ENUM('draft', 'media_ready', 'preview_verified');
  CREATE TYPE "public"."enum__tracks_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_avr_outcome" AS ENUM('pass', 'fail');
  CREATE TABLE "releases_av_sample_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"event_id" varchar
  );
  
  CREATE TABLE "_releases_v_version_subgenres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_releases_v_version_funding_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum__releases_v_version_funding_links_provider" DEFAULT 'other',
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_releases_av_sample_events_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_releases_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_type" "enum__releases_v_version_type",
  	"version_medium" "enum__releases_v_version_medium" DEFAULT 'music',
  	"version_artist_id" integer,
  	"version_release_date" timestamp(3) with time zone,
  	"version_cover_image_id" integer,
  	"version_banner_image_id" integer,
  	"version_description" varchar,
  	"version_explicit" boolean DEFAULT false,
  	"version_genre" "enum__releases_v_version_genre",
  	"version_feed_locked" boolean DEFAULT false,
  	"version_license" varchar,
  	"version_upc" varchar,
  	"version_location" varchar,
  	"version_social_url" varchar,
  	"version_suggested_sats" numeric DEFAULT 5000,
  	"version_myradio_kicker" varchar,
  	"version_myradio_theme" "enum__releases_v_version_myradio_theme" DEFAULT 'catalog',
  	"version_myradio_theme_schema_version" numeric DEFAULT 1,
  	"version_myradio_theme_revision" numeric DEFAULT 0,
  	"version_myradio_theme_assets_background_image_id" integer,
  	"version_myradio_theme_assets_texture_image_id" integer,
  	"version_myradio_theme_assets_mark_image_id" integer,
  	"version_myradio_theme_tokens_chrome" varchar,
  	"version_myradio_theme_tokens_muted" varchar,
  	"version_myradio_theme_tokens_accent" varchar,
  	"version_myradio_theme_tokens_accent_contrast" varchar,
  	"version_myradio_theme_tokens_beacon" varchar,
  	"version_myradio_theme_tokens_beacon_glow" varchar,
  	"version_myradio_theme_tokens_line" varchar,
  	"version_myradio_theme_tokens_panel_start" varchar,
  	"version_myradio_theme_tokens_panel_end" varchar,
  	"version_myradio_theme_tokens_panel_text" varchar,
  	"version_myradio_theme_tokens_panel_muted" varchar,
  	"version_myradio_theme_tokens_panel_alt" varchar,
  	"version_myradio_theme_tokens_panel_active" varchar,
  	"version_myradio_theme_tokens_action_background" varchar,
  	"version_myradio_theme_tokens_action_text" varchar,
  	"version_myradio_theme_tokens_popover_background" varchar,
  	"version_myradio_theme_tokens_popover_text" varchar,
  	"version_myradio_theme_tokens_popover_muted" varchar,
  	"version_myradio_theme_options_artwork_treatment" "mr_artwork_treatment" DEFAULT 'full',
  	"version_myradio_theme_options_type_treatment" "mr_type_treatment" DEFAULT 'default',
  	"version_myradio_theme_options_surface_treatment" "mr_surface_treatment" DEFAULT 'solid',
  	"version_myradio_theme_options_motion" "mr_theme_motion" DEFAULT 'subtle',
  	"version_myradio_signal_card_layout" "mr_signal_card_layout" DEFAULT 'standard',
  	"version_myradio_signal_card_show_artwork" boolean DEFAULT true,
  	"version_myradio_social_card_layout" "mr_social_card_layout" DEFAULT 'standard',
  	"version_myradio_heart_url" varchar,
  	"version_myradio_order" numeric DEFAULT 100,
  	"version_myradio_token" varchar,
  	"version_myradio_is_default" boolean DEFAULT false,
  	"version_myradio_terrestrial_handoff" boolean DEFAULT false,
  	"version_distribution_release_lane" "enum__releases_v_version_distribution_release_lane",
  	"version_distribution_public_visibility" "enum__releases_v_version_distribution_public_visibility" DEFAULT 'preview',
  	"version_distribution_shadow_post_url" varchar,
  	"version_distribution_shadow_post_slug" varchar,
  	"version_distribution_default_share_target" "enum__releases_v_version_distribution_default_share_target" DEFAULT 'story',
  	"version_distribution_embed_enabled" boolean DEFAULT false,
  	"version_distribution_campaign_key" varchar,
  	"version_distribution_share_title" varchar,
  	"version_distribution_share_description" varchar,
  	"version_distribution_analytics_schema_version" numeric DEFAULT 1,
  	"version_preview_attestation_attested_at" timestamp(3) with time zone,
  	"version_preview_attestation_attested_by_id" integer,
  	"version_preview_attestation_theme_revision_at" numeric,
  	"version_preview_attestation_track_fingerprint_at" varchar,
  	"version_preview_attestation_player_version_at" varchar,
  	"version_preview_attestation_schema_version_at" numeric,
  	"version_analytics_verification_latest_id" integer,
  	"version_analytics_verification_summary_verified_at" timestamp(3) with time zone,
  	"version_analytics_verification_summary_verified_by_id" integer,
  	"version_analytics_verification_summary_environment" varchar,
  	"version_analytics_verification_summary_schema_version" numeric,
  	"version_analytics_verification_summary_player_version" varchar,
  	"version_analytics_verification_summary_theme_version" numeric,
  	"version_release_guid" varchar,
  	"version_status" "enum__releases_v_version_status" DEFAULT 'draft',
  	"version_workflow_state" "enum__releases_v_version_workflow_state" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__releases_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tracks_v_version_funding_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum__tracks_v_version_funding_links_provider" DEFAULT 'other',
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tracks_v_version_subgenres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tracks_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_release_id" integer,
  	"version_track_number" numeric,
  	"version_audio_file_id" integer,
  	"version_audio_url" varchar,
  	"version_mime_type" varchar DEFAULT 'audio/mpeg',
  	"version_file_size" numeric,
  	"version_duration" numeric,
  	"version_video_url" varchar,
  	"version_video_mime_type" varchar DEFAULT 'video/mp4',
  	"version_video_file_size" numeric,
  	"version_transcript_url" varchar,
  	"version_year" numeric,
  	"version_songwriters" varchar,
  	"version_personnel" varchar,
  	"version_story" varchar,
  	"version_hide_funding" boolean DEFAULT false,
  	"version_artwork_id" integer,
  	"version_description" varchar,
  	"version_explicit" boolean DEFAULT false,
  	"version_isrc" varchar,
  	"version_genre" "enum__tracks_v_version_genre",
  	"version_guid" varchar,
  	"version_share_id" varchar,
  	"version_share_excerpt" varchar,
  	"version_lyrics_status" "enum__tracks_v_version_lyrics_status" DEFAULT 'missing',
  	"version_rights_confirmed" boolean DEFAULT false,
  	"version_rights_confirmed_at" timestamp(3) with time zone,
  	"version_rights_confirmed_by_id" integer,
  	"version_track_readiness" "enum__tracks_v_version_track_readiness" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tracks_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "avr_sample_event_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"event_id" varchar
  );
  
  CREATE TABLE "avr" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"release_id" integer NOT NULL,
  	"track_id" integer,
  	"attempted_at" timestamp(3) with time zone,
  	"attempted_by_id" integer,
  	"environment" varchar NOT NULL,
  	"outcome" "enum_avr_outcome" NOT NULL,
  	"schema_version" numeric,
  	"player_version" varchar,
  	"theme_version" numeric,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "releases_subgenres" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "releases_funding_links" ALTER COLUMN "provider" DROP NOT NULL;
  ALTER TABLE "releases_funding_links" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "type" DROP NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "artist_id" DROP NOT NULL;
  ALTER TABLE "tracks_funding_links" ALTER COLUMN "provider" DROP NOT NULL;
  ALTER TABLE "tracks_funding_links" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "tracks_subgenres" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "release_id" DROP NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "track_number" DROP NOT NULL;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_schema_version" numeric DEFAULT 1;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_revision" numeric DEFAULT 0;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_assets_background_image_id" integer;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_assets_texture_image_id" integer;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_assets_mark_image_id" integer;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_chrome" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_muted" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_accent" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_accent_contrast" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_beacon" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_beacon_glow" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_line" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_start" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_end" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_text" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_muted" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_alt" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_panel_active" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_action_background" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_action_text" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_popover_background" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_popover_text" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_tokens_popover_muted" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_options_artwork_treatment" "mr_artwork_treatment" DEFAULT 'full';
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_options_type_treatment" "mr_type_treatment" DEFAULT 'default';
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_options_surface_treatment" "mr_surface_treatment" DEFAULT 'solid';
  ALTER TABLE "releases" ADD COLUMN "myradio_theme_options_motion" "mr_theme_motion" DEFAULT 'subtle';
  ALTER TABLE "releases" ADD COLUMN "myradio_signal_card_layout" "mr_signal_card_layout" DEFAULT 'standard';
  ALTER TABLE "releases" ADD COLUMN "myradio_signal_card_show_artwork" boolean DEFAULT true;
  ALTER TABLE "releases" ADD COLUMN "myradio_social_card_layout" "mr_social_card_layout" DEFAULT 'standard';
  ALTER TABLE "releases" ADD COLUMN "distribution_release_lane" "enum_releases_distribution_release_lane";
  ALTER TABLE "releases" ADD COLUMN "distribution_public_visibility" "enum_releases_distribution_public_visibility" DEFAULT 'preview';
  ALTER TABLE "releases" ADD COLUMN "distribution_shadow_post_url" varchar;
  ALTER TABLE "releases" ADD COLUMN "distribution_shadow_post_slug" varchar;
  ALTER TABLE "releases" ADD COLUMN "distribution_default_share_target" "enum_releases_distribution_default_share_target" DEFAULT 'story';
  ALTER TABLE "releases" ADD COLUMN "distribution_embed_enabled" boolean DEFAULT false;
  ALTER TABLE "releases" ADD COLUMN "distribution_campaign_key" varchar;
  ALTER TABLE "releases" ADD COLUMN "distribution_share_title" varchar;
  ALTER TABLE "releases" ADD COLUMN "distribution_share_description" varchar;
  ALTER TABLE "releases" ADD COLUMN "distribution_analytics_schema_version" numeric DEFAULT 1;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_attested_at" timestamp(3) with time zone;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_attested_by_id" integer;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_theme_revision_at" numeric;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_track_fingerprint_at" varchar;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_player_version_at" varchar;
  ALTER TABLE "releases" ADD COLUMN "preview_attestation_schema_version_at" numeric;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_latest_id" integer;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_verified_at" timestamp(3) with time zone;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_verified_by_id" integer;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_environment" varchar;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_schema_version" numeric;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_player_version" varchar;
  ALTER TABLE "releases" ADD COLUMN "analytics_verification_summary_theme_version" numeric;
  ALTER TABLE "releases" ADD COLUMN "workflow_state" "enum_releases_workflow_state" DEFAULT 'draft';
  ALTER TABLE "releases" ADD COLUMN "_status" "enum_releases_status" DEFAULT 'draft';
  ALTER TABLE "tracks" ADD COLUMN "share_id" varchar;
  ALTER TABLE "tracks" ADD COLUMN "share_excerpt" varchar;
  ALTER TABLE "tracks" ADD COLUMN "lyrics_status" "enum_tracks_lyrics_status" DEFAULT 'missing';
  ALTER TABLE "tracks" ADD COLUMN "rights_confirmed" boolean DEFAULT false;
  ALTER TABLE "tracks" ADD COLUMN "rights_confirmed_at" timestamp(3) with time zone;
  ALTER TABLE "tracks" ADD COLUMN "rights_confirmed_by_id" integer;
  ALTER TABLE "tracks" ADD COLUMN "track_readiness" "enum_tracks_track_readiness" DEFAULT 'draft';
  ALTER TABLE "tracks" ADD COLUMN "_status" "enum_tracks_status" DEFAULT 'draft';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "avr_id" integer;
  ALTER TABLE "releases_av_sample_events" ADD CONSTRAINT "releases_av_sample_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_releases_v_version_subgenres" ADD CONSTRAINT "_releases_v_version_subgenres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_releases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_releases_v_version_funding_links" ADD CONSTRAINT "_releases_v_version_funding_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_releases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_releases_av_sample_events_v" ADD CONSTRAINT "_releases_av_sample_events_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_releases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_parent_id_releases_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_artist_id_artists_id_fk" FOREIGN KEY ("version_artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_banner_image_id_media_id_fk" FOREIGN KEY ("version_banner_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_myradio_theme_assets_background_image_id_media_id_fk" FOREIGN KEY ("version_myradio_theme_assets_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_myradio_theme_assets_texture_image_id_media_id_fk" FOREIGN KEY ("version_myradio_theme_assets_texture_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_myradio_theme_assets_mark_image_id_media_id_fk" FOREIGN KEY ("version_myradio_theme_assets_mark_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_preview_attestation_attested_by_id_users_id_fk" FOREIGN KEY ("version_preview_attestation_attested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_analytics_verification_latest_id_avr_id_fk" FOREIGN KEY ("version_analytics_verification_latest_id") REFERENCES "public"."avr"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_analytics_verification_summary_verified_by_id_users_id_fk" FOREIGN KEY ("version_analytics_verification_summary_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v_version_funding_links" ADD CONSTRAINT "_tracks_v_version_funding_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tracks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tracks_v_version_subgenres" ADD CONSTRAINT "_tracks_v_version_subgenres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tracks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_parent_id_tracks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_release_id_releases_id_fk" FOREIGN KEY ("version_release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_audio_file_id_audio_media_id_fk" FOREIGN KEY ("version_audio_file_id") REFERENCES "public"."audio_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_artwork_id_media_id_fk" FOREIGN KEY ("version_artwork_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracks_v" ADD CONSTRAINT "_tracks_v_version_rights_confirmed_by_id_users_id_fk" FOREIGN KEY ("version_rights_confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avr_sample_event_ids" ADD CONSTRAINT "avr_sample_event_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."avr"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avr" ADD CONSTRAINT "avr_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avr" ADD CONSTRAINT "avr_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avr" ADD CONSTRAINT "avr_attempted_by_id_users_id_fk" FOREIGN KEY ("attempted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "releases_av_sample_events_order_idx" ON "releases_av_sample_events" USING btree ("_order");
  CREATE INDEX "releases_av_sample_events_parent_id_idx" ON "releases_av_sample_events" USING btree ("_parent_id");
  CREATE INDEX "_releases_v_version_subgenres_order_idx" ON "_releases_v_version_subgenres" USING btree ("_order");
  CREATE INDEX "_releases_v_version_subgenres_parent_id_idx" ON "_releases_v_version_subgenres" USING btree ("_parent_id");
  CREATE INDEX "_releases_v_version_funding_links_order_idx" ON "_releases_v_version_funding_links" USING btree ("_order");
  CREATE INDEX "_releases_v_version_funding_links_parent_id_idx" ON "_releases_v_version_funding_links" USING btree ("_parent_id");
  CREATE INDEX "_releases_av_sample_events_v_order_idx" ON "_releases_av_sample_events_v" USING btree ("_order");
  CREATE INDEX "_releases_av_sample_events_v_parent_id_idx" ON "_releases_av_sample_events_v" USING btree ("_parent_id");
  CREATE INDEX "_releases_v_parent_idx" ON "_releases_v" USING btree ("parent_id");
  CREATE INDEX "_releases_v_version_version_slug_idx" ON "_releases_v" USING btree ("version_slug");
  CREATE INDEX "_releases_v_version_version_artist_idx" ON "_releases_v" USING btree ("version_artist_id");
  CREATE INDEX "_releases_v_version_version_cover_image_idx" ON "_releases_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_releases_v_version_version_banner_image_idx" ON "_releases_v" USING btree ("version_banner_image_id");
  CREATE INDEX "_releases_v_version_myradio_theme_assets_version_myradio_idx" ON "_releases_v" USING btree ("version_myradio_theme_assets_background_image_id");
  CREATE INDEX "_releases_v_version_myradio_theme_assets_version_myrad_1_idx" ON "_releases_v" USING btree ("version_myradio_theme_assets_texture_image_id");
  CREATE INDEX "_releases_v_version_myradio_theme_assets_version_myrad_2_idx" ON "_releases_v" USING btree ("version_myradio_theme_assets_mark_image_id");
  CREATE INDEX "_releases_v_version_preview_attestation_version_preview__idx" ON "_releases_v" USING btree ("version_preview_attestation_attested_by_id");
  CREATE INDEX "_releases_v_version_analytics_verification_version_analy_idx" ON "_releases_v" USING btree ("version_analytics_verification_latest_id");
  CREATE INDEX "_releases_v_version_analytics_verification_summary_versi_idx" ON "_releases_v" USING btree ("version_analytics_verification_summary_verified_by_id");
  CREATE INDEX "_releases_v_version_version_release_guid_idx" ON "_releases_v" USING btree ("version_release_guid");
  CREATE INDEX "_releases_v_version_version_updated_at_idx" ON "_releases_v" USING btree ("version_updated_at");
  CREATE INDEX "_releases_v_version_version_created_at_idx" ON "_releases_v" USING btree ("version_created_at");
  CREATE INDEX "_releases_v_version_version__status_idx" ON "_releases_v" USING btree ("version__status");
  CREATE INDEX "_releases_v_created_at_idx" ON "_releases_v" USING btree ("created_at");
  CREATE INDEX "_releases_v_updated_at_idx" ON "_releases_v" USING btree ("updated_at");
  CREATE INDEX "_releases_v_latest_idx" ON "_releases_v" USING btree ("latest");
  CREATE INDEX "_releases_v_autosave_idx" ON "_releases_v" USING btree ("autosave");
  CREATE INDEX "_tracks_v_version_funding_links_order_idx" ON "_tracks_v_version_funding_links" USING btree ("_order");
  CREATE INDEX "_tracks_v_version_funding_links_parent_id_idx" ON "_tracks_v_version_funding_links" USING btree ("_parent_id");
  CREATE INDEX "_tracks_v_version_subgenres_order_idx" ON "_tracks_v_version_subgenres" USING btree ("_order");
  CREATE INDEX "_tracks_v_version_subgenres_parent_id_idx" ON "_tracks_v_version_subgenres" USING btree ("_parent_id");
  CREATE INDEX "_tracks_v_parent_idx" ON "_tracks_v" USING btree ("parent_id");
  CREATE INDEX "_tracks_v_version_version_slug_idx" ON "_tracks_v" USING btree ("version_slug");
  CREATE INDEX "_tracks_v_version_version_release_idx" ON "_tracks_v" USING btree ("version_release_id");
  CREATE INDEX "_tracks_v_version_version_audio_file_idx" ON "_tracks_v" USING btree ("version_audio_file_id");
  CREATE INDEX "_tracks_v_version_version_artwork_idx" ON "_tracks_v" USING btree ("version_artwork_id");
  CREATE INDEX "_tracks_v_version_version_guid_idx" ON "_tracks_v" USING btree ("version_guid");
  CREATE INDEX "_tracks_v_version_version_share_id_idx" ON "_tracks_v" USING btree ("version_share_id");
  CREATE INDEX "_tracks_v_version_version_rights_confirmed_by_idx" ON "_tracks_v" USING btree ("version_rights_confirmed_by_id");
  CREATE INDEX "_tracks_v_version_version_updated_at_idx" ON "_tracks_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracks_v_version_version_created_at_idx" ON "_tracks_v" USING btree ("version_created_at");
  CREATE INDEX "_tracks_v_version_version__status_idx" ON "_tracks_v" USING btree ("version__status");
  CREATE INDEX "_tracks_v_created_at_idx" ON "_tracks_v" USING btree ("created_at");
  CREATE INDEX "_tracks_v_updated_at_idx" ON "_tracks_v" USING btree ("updated_at");
  CREATE INDEX "_tracks_v_latest_idx" ON "_tracks_v" USING btree ("latest");
  CREATE INDEX "_tracks_v_autosave_idx" ON "_tracks_v" USING btree ("autosave");
  CREATE INDEX "avr_sample_event_ids_order_idx" ON "avr_sample_event_ids" USING btree ("_order");
  CREATE INDEX "avr_sample_event_ids_parent_id_idx" ON "avr_sample_event_ids" USING btree ("_parent_id");
  CREATE INDEX "avr_release_idx" ON "avr" USING btree ("release_id");
  CREATE INDEX "avr_track_idx" ON "avr" USING btree ("track_id");
  CREATE INDEX "avr_attempted_by_idx" ON "avr" USING btree ("attempted_by_id");
  CREATE INDEX "avr_updated_at_idx" ON "avr" USING btree ("updated_at");
  CREATE INDEX "avr_created_at_idx" ON "avr" USING btree ("created_at");
  ALTER TABLE "releases" ADD CONSTRAINT "releases_myradio_theme_assets_background_image_id_media_id_fk" FOREIGN KEY ("myradio_theme_assets_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_myradio_theme_assets_texture_image_id_media_id_fk" FOREIGN KEY ("myradio_theme_assets_texture_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_myradio_theme_assets_mark_image_id_media_id_fk" FOREIGN KEY ("myradio_theme_assets_mark_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_preview_attestation_attested_by_id_users_id_fk" FOREIGN KEY ("preview_attestation_attested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_analytics_verification_latest_id_avr_id_fk" FOREIGN KEY ("analytics_verification_latest_id") REFERENCES "public"."avr"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_analytics_verification_summary_verified_by_id_users_id_fk" FOREIGN KEY ("analytics_verification_summary_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracks" ADD CONSTRAINT "tracks_rights_confirmed_by_id_users_id_fk" FOREIGN KEY ("rights_confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_verification_rece_fk" FOREIGN KEY ("avr_id") REFERENCES "public"."avr"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "releases_myradio_theme_assets_myradio_theme_assets_backg_idx" ON "releases" USING btree ("myradio_theme_assets_background_image_id");
  CREATE INDEX "releases_myradio_theme_assets_myradio_theme_assets_textu_idx" ON "releases" USING btree ("myradio_theme_assets_texture_image_id");
  CREATE INDEX "releases_myradio_theme_assets_myradio_theme_assets_mark__idx" ON "releases" USING btree ("myradio_theme_assets_mark_image_id");
  CREATE INDEX "releases_preview_attestation_preview_attestation_atteste_idx" ON "releases" USING btree ("preview_attestation_attested_by_id");
  CREATE INDEX "releases_analytics_verification_analytics_verification_l_idx" ON "releases" USING btree ("analytics_verification_latest_id");
  CREATE INDEX "releases_analytics_verification_summary_analytics_verifi_idx" ON "releases" USING btree ("analytics_verification_summary_verified_by_id");
  CREATE INDEX "releases__status_idx" ON "releases" USING btree ("_status");
  CREATE UNIQUE INDEX "tracks_share_id_idx" ON "tracks" USING btree ("share_id");
  CREATE INDEX "tracks_rights_confirmed_by_idx" ON "tracks" USING btree ("rights_confirmed_by_id");
  CREATE INDEX "tracks__status_idx" ON "tracks" USING btree ("_status");
  CREATE INDEX "payload_locked_documents_rels_avr_id_idx" ON "payload_locked_documents_rels" USING btree ("avr_id");`)

  // --- Data backfill (hand-added; migrate:create only diffs schema, not data) ---
  // Compatibility requirement: existing published releases and tracks must keep
  // resolving publicly exactly as before, without needing any of this new metadata
  // filled in by hand.
  //
  // IMPORTANT, confirmed by actually running this against a scratch database: the
  // ADD COLUMN above specifies `DEFAULT 'preview'`, and Postgres backfills that
  // default into every existing row immediately — the column is never NULL by the
  // time this statement runs. An `IS NULL` guard here would silently match nothing.
  // Every release that was already `published` before this migration must become
  // `public`, unconditionally, full stop — there is no prior legitimate value to
  // preserve, since this field did not exist before this migration.
  await db.execute(sql`
    UPDATE "releases"
    SET "distribution_public_visibility" = 'public'
    WHERE "status" = 'published';

    UPDATE "tracks"
    SET "share_id" = "guid"
    WHERE "share_id" IS NULL AND "guid" IS NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "releases_av_sample_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_releases_v_version_subgenres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_releases_v_version_funding_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_releases_av_sample_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_releases_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tracks_v_version_funding_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tracks_v_version_subgenres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_tracks_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "avr_sample_event_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "avr" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "releases_av_sample_events" CASCADE;
  DROP TABLE "_releases_v_version_subgenres" CASCADE;
  DROP TABLE "_releases_v_version_funding_links" CASCADE;
  DROP TABLE "_releases_av_sample_events_v" CASCADE;
  DROP TABLE "_releases_v" CASCADE;
  DROP TABLE "_tracks_v_version_funding_links" CASCADE;
  DROP TABLE "_tracks_v_version_subgenres" CASCADE;
  DROP TABLE "_tracks_v" CASCADE;
  DROP TABLE "avr_sample_event_ids" CASCADE;
  DROP TABLE "avr" CASCADE;
  ALTER TABLE "releases" DROP CONSTRAINT "releases_myradio_theme_assets_background_image_id_media_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_myradio_theme_assets_texture_image_id_media_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_myradio_theme_assets_mark_image_id_media_id_fk";
  
  ALTER TABLE "releases" DROP CONSTRAINT "releases_preview_attestation_attested_by_id_users_id_fk";

  -- NOTE (hand-fixed, confirmed by actually running this down migration against a
  -- scratch database): auto-generated code originally had an explicit
  -- ALTER TABLE "releases" DROP CONSTRAINT "releases_analytics_verification_latest_id_avr_id_fk"
  -- here, but the DROP TABLE "avr" CASCADE above already removes that same FK
  -- constraint as a side effect (it references avr.id). Running both, in this order,
  -- fails with "constraint ... does not exist" because the explicit drop is now
  -- redundant. Removed rather than reordered, since reordering would just move the
  -- same redundancy earlier.

  ALTER TABLE "releases" DROP CONSTRAINT "releases_analytics_verification_summary_verified_by_id_users_id_fk";
  
  ALTER TABLE "tracks" DROP CONSTRAINT "tracks_rights_confirmed_by_id_users_id_fk";

  -- NOTE (hand-fixed, same reasoning as above): this FK also references avr.id, so
  -- DROP TABLE "avr" CASCADE already removed it. The explicit drop is redundant and
  -- errors with "constraint ... does not exist" if left in.

  DROP INDEX "releases_myradio_theme_assets_myradio_theme_assets_backg_idx";
  DROP INDEX "releases_myradio_theme_assets_myradio_theme_assets_textu_idx";
  DROP INDEX "releases_myradio_theme_assets_myradio_theme_assets_mark__idx";
  DROP INDEX "releases_preview_attestation_preview_attestation_atteste_idx";
  DROP INDEX "releases_analytics_verification_analytics_verification_l_idx";
  DROP INDEX "releases_analytics_verification_summary_analytics_verifi_idx";
  DROP INDEX "releases__status_idx";
  DROP INDEX "tracks_share_id_idx";
  DROP INDEX "tracks_rights_confirmed_by_idx";
  DROP INDEX "tracks__status_idx";
  DROP INDEX "payload_locked_documents_rels_avr_id_idx";
  ALTER TABLE "releases_subgenres" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "releases_funding_links" ALTER COLUMN "provider" SET NOT NULL;
  ALTER TABLE "releases_funding_links" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "type" SET NOT NULL;
  ALTER TABLE "releases" ALTER COLUMN "artist_id" SET NOT NULL;
  ALTER TABLE "tracks_funding_links" ALTER COLUMN "provider" SET NOT NULL;
  ALTER TABLE "tracks_funding_links" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "tracks_subgenres" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "release_id" SET NOT NULL;
  ALTER TABLE "tracks" ALTER COLUMN "track_number" SET NOT NULL;
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_schema_version";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_revision";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_assets_background_image_id";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_assets_texture_image_id";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_assets_mark_image_id";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_chrome";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_muted";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_accent";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_accent_contrast";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_beacon";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_beacon_glow";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_line";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_start";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_end";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_text";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_muted";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_alt";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_panel_active";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_action_background";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_action_text";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_popover_background";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_popover_text";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_tokens_popover_muted";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_options_artwork_treatment";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_options_type_treatment";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_options_surface_treatment";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme_options_motion";
  ALTER TABLE "releases" DROP COLUMN "myradio_signal_card_layout";
  ALTER TABLE "releases" DROP COLUMN "myradio_signal_card_show_artwork";
  ALTER TABLE "releases" DROP COLUMN "myradio_social_card_layout";
  ALTER TABLE "releases" DROP COLUMN "distribution_release_lane";
  ALTER TABLE "releases" DROP COLUMN "distribution_public_visibility";
  ALTER TABLE "releases" DROP COLUMN "distribution_shadow_post_url";
  ALTER TABLE "releases" DROP COLUMN "distribution_shadow_post_slug";
  ALTER TABLE "releases" DROP COLUMN "distribution_default_share_target";
  ALTER TABLE "releases" DROP COLUMN "distribution_embed_enabled";
  ALTER TABLE "releases" DROP COLUMN "distribution_campaign_key";
  ALTER TABLE "releases" DROP COLUMN "distribution_share_title";
  ALTER TABLE "releases" DROP COLUMN "distribution_share_description";
  ALTER TABLE "releases" DROP COLUMN "distribution_analytics_schema_version";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_attested_at";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_attested_by_id";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_theme_revision_at";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_track_fingerprint_at";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_player_version_at";
  ALTER TABLE "releases" DROP COLUMN "preview_attestation_schema_version_at";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_latest_id";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_verified_at";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_verified_by_id";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_environment";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_schema_version";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_player_version";
  ALTER TABLE "releases" DROP COLUMN "analytics_verification_summary_theme_version";
  ALTER TABLE "releases" DROP COLUMN "workflow_state";
  ALTER TABLE "releases" DROP COLUMN "_status";
  ALTER TABLE "tracks" DROP COLUMN "share_id";
  ALTER TABLE "tracks" DROP COLUMN "share_excerpt";
  ALTER TABLE "tracks" DROP COLUMN "lyrics_status";
  ALTER TABLE "tracks" DROP COLUMN "rights_confirmed";
  ALTER TABLE "tracks" DROP COLUMN "rights_confirmed_at";
  ALTER TABLE "tracks" DROP COLUMN "rights_confirmed_by_id";
  ALTER TABLE "tracks" DROP COLUMN "track_readiness";
  ALTER TABLE "tracks" DROP COLUMN "_status";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "avr_id";
  DROP TYPE "public"."mr_artwork_treatment";
  DROP TYPE "public"."mr_type_treatment";
  DROP TYPE "public"."mr_surface_treatment";
  DROP TYPE "public"."mr_theme_motion";
  DROP TYPE "public"."mr_signal_card_layout";
  DROP TYPE "public"."mr_social_card_layout";
  DROP TYPE "public"."enum_releases_distribution_release_lane";
  DROP TYPE "public"."enum_releases_distribution_public_visibility";
  DROP TYPE "public"."enum_releases_distribution_default_share_target";
  DROP TYPE "public"."enum_releases_workflow_state";
  DROP TYPE "public"."enum__releases_v_version_funding_links_provider";
  DROP TYPE "public"."enum__releases_v_version_type";
  DROP TYPE "public"."enum__releases_v_version_medium";
  DROP TYPE "public"."enum__releases_v_version_genre";
  DROP TYPE "public"."enum__releases_v_version_myradio_theme";
  DROP TYPE "public"."enum__releases_v_version_distribution_release_lane";
  DROP TYPE "public"."enum__releases_v_version_distribution_public_visibility";
  DROP TYPE "public"."enum__releases_v_version_distribution_default_share_target";
  DROP TYPE "public"."enum__releases_v_version_status";
  DROP TYPE "public"."enum__releases_v_version_workflow_state";
  DROP TYPE "public"."enum_tracks_lyrics_status";
  DROP TYPE "public"."enum_tracks_track_readiness";
  DROP TYPE "public"."enum_tracks_status";
  DROP TYPE "public"."enum__tracks_v_version_funding_links_provider";
  DROP TYPE "public"."enum__tracks_v_version_genre";
  DROP TYPE "public"."enum__tracks_v_version_lyrics_status";
  DROP TYPE "public"."enum__tracks_v_version_track_readiness";
  DROP TYPE "public"."enum__tracks_v_version_status";
  DROP TYPE "public"."enum_avr_outcome";`)
}
