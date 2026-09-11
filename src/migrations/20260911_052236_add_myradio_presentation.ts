import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_releases_myradio_theme" AS ENUM('catalog', 'terrestrial', 'nathan-archive', 'wooden-revolt', 'parade', 'monochrome');
  ALTER TABLE "artists" ALTER COLUMN "user_id" DROP NOT NULL;
  ALTER TABLE "releases" ADD COLUMN "myradio_kicker" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_theme" "enum_releases_myradio_theme" DEFAULT 'catalog';
  ALTER TABLE "releases" ADD COLUMN "myradio_heart_url" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_token" varchar;
  ALTER TABLE "releases" ADD COLUMN "myradio_is_default" boolean DEFAULT false;
  ALTER TABLE "releases" ADD COLUMN "myradio_terrestrial_handoff" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artists" ALTER COLUMN "user_id" SET NOT NULL;
  ALTER TABLE "releases" DROP COLUMN "myradio_kicker";
  ALTER TABLE "releases" DROP COLUMN "myradio_theme";
  ALTER TABLE "releases" DROP COLUMN "myradio_heart_url";
  ALTER TABLE "releases" DROP COLUMN "myradio_token";
  ALTER TABLE "releases" DROP COLUMN "myradio_is_default";
  ALTER TABLE "releases" DROP COLUMN "myradio_terrestrial_handoff";
  DROP TYPE "public"."enum_releases_myradio_theme";`)
}
