CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" character varying NOT NULL,
  "email" character varying NOT NULL,
  "password" character varying NULL,
  "provider" character varying NOT NULL DEFAULT 'local',
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "uq_users_email" UNIQUE ("email")
);
