CREATE TABLE IF NOT EXISTS "public"."sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "access_token" character varying NOT NULL,
  "refresh_token" character varying NOT NULL,
  "access_token_expires_at" timestamptz NOT NULL,
  "refresh_token_expires_at" timestamptz NOT NULL,
  "remember_me" boolean NOT NULL DEFAULT false,
  "ip_address" character varying NULL,
  "user_agent" character varying NULL,
  "is_revoked" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "uq_sessions_access_token" UNIQUE ("access_token"),
  CONSTRAINT "uq_sessions_refresh_token" UNIQUE ("refresh_token"),
  CONSTRAINT "fk_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_sessions_access_token" ON "public"."sessions" ("access_token");
CREATE INDEX IF NOT EXISTS "idx_sessions_refresh_token" ON "public"."sessions" ("refresh_token");
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "public"."sessions" ("user_id");
