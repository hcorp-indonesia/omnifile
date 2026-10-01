CREATE TABLE "public"."products" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "price" integer NOT NULL,
  "stock" integer NOT NULL DEFAULT 0,
  "status" boolean NOT NULL DEFAULT true,
  "image_key" character varying NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "products_name_key" UNIQUE ("name")
);
