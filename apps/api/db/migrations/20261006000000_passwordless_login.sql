CREATE TABLE IF NOT EXISTS "public"."login_otps" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" character varying NOT NULL,
  "code_digest" character varying NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "used_at" timestamptz NULL,
  "requested_ip" character varying NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_login_otps_email_created_at"
  ON "public"."login_otps" ("email", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_login_otps_expires_at"
  ON "public"."login_otps" ("expires_at");

DROP TABLE IF EXISTS "public"."password_reset_tokens";

ALTER TABLE "public"."users"
  DROP COLUMN IF EXISTS "password";

ALTER TABLE "public"."users"
  ALTER COLUMN "provider" SET DEFAULT 'email_otp';

UPDATE "public"."users"
SET "provider" = 'email_otp', "updated_at" = CURRENT_TIMESTAMP
WHERE "provider" <> 'email_otp';
