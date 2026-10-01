CREATE TABLE "public"."converters" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "from_unit" character varying NOT NULL,
  "to_unit" character varying NOT NULL,
  "formula" character varying NOT NULL,
  "category" character varying NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "image_key" character varying NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
