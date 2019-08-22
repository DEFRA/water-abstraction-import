/**
 * These tables create GUIDs to uniquely identify each row
 * to make joins simpler
 */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "water_import"."charge_versions" (
  "charge_version_id" varchar NOT NULL DEFAULT gen_random_uuid(),
  "licence_id" integer NOT NULL,
  "version" integer NOT NULL,
  "region_code" integer NOT NULL,
  "date_created" timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("charge_version_id"),
  UNIQUE(licence_id, version, region_code)
);

CREATE TABLE IF NOT EXISTS "water_import"."charge_elements" (
  "charge_element_id" varchar NOT NULL DEFAULT gen_random_uuid(),
  "element_id" integer NOT NULL,
  "licence_id" integer NOT NULL,
  "version" integer NOT NULL,
  "region_code" integer NOT NULL,
  "date_created" timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("charge_element_id"),
  UNIQUE(element_id, licence_id, version, region_code)
);

CREATE TABLE IF NOT EXISTS "water_import"."charge_agreements" (
  "charge_agreement_id" varchar NOT NULL DEFAULT gen_random_uuid(),
  "element_id" integer NOT NULL,
  "afsa_code" varchar NOT NULL,
  "start_date" date NOT NULL,
  "region_code" integer NOT NULL,
  "date_created" timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("charge_agreement_id"),
  UNIQUE(element_id, afsa_code, start_date, region_code)
);
