/* Replace with your SQL commands */
CREATE TABLE IF NOT EXISTS "water_import"."import_companies" (
  "import_company_id" varchar NOT NULL DEFAULT gen_random_uuid(),
  "region_code" integer NOT NULL,
  "party_id" integer NOT NULL,
  "imported" boolean NOT NULL DEFAULT false,
  "date_created" timestamp NOT NULL DEFAULT NOW(),
  "date_updated" timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("import_company_id"),
  UNIQUE(region_code, party_id)
);