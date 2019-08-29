const createChargeVersionGuids = `INSERT INTO water_import.charge_versions
(licence_id, version, region_code)
SELECT
v."AABL_ID"::integer,
v."VERS_NO"::integer,
v."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_VERSIONS" v
ON CONFLICT DO NOTHING;`;

const createChargeElementGuids = `INSERT INTO water_import.charge_elements
  (element_id, licence_id, version, region_code)
SELECT
e."ID"::integer,
e."ACVR_AABL_ID"::integer,
e."ACVR_VERS_NO"::integer,
e."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_ELEMENTS" e
ON CONFLICT DO NOTHING`;

const createChargeAgreementGuids = `
INSERT INTO water_import.charge_agreements
(element_id, afsa_code, start_date, region_code)
SELECT a."ACEL_ID"::integer,
a."AFSA_CODE",
to_date(a."EFF_ST_DATE", 'DD/MM/YYYY') as "EFF_ST_DATE",
a."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_AGRMNTS" a
ON CONFLICT DO NOTHING`;

const importChargeVersions = `INSERT INTO water.charge_versions
(charge_version_id, licence_ref, scheme, external_id, version_number, start_date, status, apportionment,
error, end_date, billed_upto_date, region_code, date_created, date_updated, source)

SELECT
  cv.charge_version_id,
  l."LIC_NO" AS licence_ref,
  'alcs' AS scheme,
  v."AABL_ID"::integer AS external_id,
  v."VERS_NO"::integer AS version_number,
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,

(CASE v."STATUS"
  WHEN 'SUPER' THEN 'superseded'
  WHEN 'DRAFT' THEN 'draft'
  WHEN 'CURR' THEN 'current'
END)::water.charge_version_status AS status,

CASE v."APPORTIONMENT"
  WHEN 'Y' THEN true
  WHEN 'N' THEN false
END AS apportionment,

CASE v."IN_ERROR_STATUS"
  WHEN 'Y' THEN true
  WHEN 'N' THEN false
END AS error,

case v."EFF_END_DATE"
  when 'null' then null
  else to_date(v."EFF_END_DATE", 'DD/MM/YYYY')
end AS end_date,

case v."BILLED_UPTO_DATE"
  when 'null' then null
  else to_date(v."BILLED_UPTO_DATE", 'DD/MM/YYYY')
end AS billed_upto_date,

v."FGAC_REGION_CODE"::integer AS region,

NOW() AS date_created,

NOW() AS date_updated,

'nald' AS source

FROM import."NALD_CHG_VERSIONS" v
JOIN water_import.charge_versions cv ON v."AABL_ID"::integer=cv.licence_id AND v."FGAC_REGION_CODE"::integer=cv.region_code AND v."VERS_NO"::integer=cv.version
JOIN import."NALD_ABS_LICENCES" l ON v."AABL_ID"=l."ID" AND v."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"

ON CONFLICT (charge_version_id) DO UPDATE SET
licence_ref=EXCLUDED.licence_ref, scheme=EXCLUDED.scheme, external_id=EXCLUDED.external_id,
version_number=EXCLUDED.version_number, start_date=EXCLUDED.start_date,
status=EXCLUDED.status, apportionment=EXCLUDED.apportionment,
error=EXCLUDED.error, end_date=EXCLUDED.end_date,
billed_upto_date=EXCLUDED.billed_upto_date,
region_code=EXCLUDED.region_code, date_updated=EXCLUDED.date_updated,
source=EXCLUDED.source;`;

// Deletes charge versions that are no longer present in the NALD import
const cleanupChargeVersions = `
DELETE FROM water.charge_versions WHERE charge_version_id IN (
  SELECT v.charge_version_id FROM water_import.charge_versions v
  LEFT JOIN import."NALD_CHG_VERSIONS" iv ON v.licence_id=iv."AABL_ID"::integer AND v.version=iv."VERS_NO"::integer AND v.region_code=iv."FGAC_REGION_CODE"::integer
  WHERE iv."AABL_ID" IS NULL
)
`;

const importChargeElements = `
INSERT INTO water.charge_elements
(charge_element_id, charge_version_id, external_id, abstraction_period_start_day, abstraction_period_start_month,
abstraction_period_end_day, abstraction_period_end_month, authorised_annual_quantity, season, season_derived,
source, loss, purpose_primary, purpose_secondary, purpose_tertiary, factors_overridden, billable_annual_quantity,
time_limited_start_date, time_limited_end_date, description, date_created, date_updated)

SELECT ie.charge_element_id, iv.charge_version_id, e."ID"::integer AS external_id,
e."ABS_PERIOD_ST_DAY"::integer AS abstraction_period_start_day,
e."ABS_PERIOD_ST_MONTH"::integer AS abstraction_period_start_month,
e."ABS_PERIOD_END_DAY"::integer AS abstraction_period_end_day,
e."ABS_PERIOD_END_MONTH"::integer AS abstraction_period_end_month,
e."AUTH_ANN_QTY"::numeric AS authorised_annual_quantity,

(CASE e."ASFT_CODE"
  WHEN 'S' THEN 'summer'
  WHEN 'W' THEN 'winter'
  WHEN 'A' THEN 'all year'
END)::water.charge_element_season AS season,

(CASE e."ASFT_CODE_DERIVED"
  WHEN 'S' THEN 'summer'
  WHEN 'W' THEN 'winter'
  WHEN 'A' THEN 'all year'
END)::water.charge_element_season AS season_derived,

(CASE e."ASRF_CODE"
  WHEN 'S' THEN 'supported'
  WHEN 'U' THEN 'unsupported'
  WHEN 'K' THEN 'kielder'
  WHEN 'T' THEN 'tidal'
END)::water.charge_element_source AS source,

(CASE e."ALSF_CODE"
  WHEN 'H' THEN 'high'
  WHEN 'M' THEN 'medium'
  WHEN 'L' THEN 'low'
  WHEN 'V' THEN 'very low'
  WHEN 'N' THEN 'non-chargeable'
END)::water.charge_element_loss AS loss,

e."APUR_APPR_CODE" AS purpose_primary,
e."APUR_APSE_CODE" AS purpose_seconday,
e."APUR_APUS_CODE"::integer AS purpose_tertiary,

e."FCTS_OVERRIDDEN"::boolean AS factors_overridden,

NULLIF(e."BILLABLE_ANN_QTY", 'null')::numeric AS billable_annual_quantity,

  case e."TIMELTD_ST_DATE"
    when 'null' then null
    else to_date(e."TIMELTD_ST_DATE", 'DD/MM/YYYY')
  end AS time_limited_start_date,

  case e."TIMELTD_END_DATE"
    when 'null' then null
    else to_date(e."TIMELTD_END_DATE", 'DD/MM/YYYY')
  end AS time_limited_end_date,

  NULLIF(e."DESCR", 'null') AS description,

  NOW() AS date_created,
  NOW() AS date_updated

FROM import."NALD_CHG_ELEMENTS" e
JOIN water_import.charge_elements ie ON e."ID"::integer=ie.element_id AND e."ACVR_AABL_ID"::integer = ie.licence_id AND e."FGAC_REGION_CODE"::integer = ie.region_code
JOIN water_import.charge_versions iv ON e."ACVR_AABL_ID"::integer=iv.licence_id AND e."ACVR_VERS_NO"::integer=iv.version AND e."FGAC_REGION_CODE"::integer = iv.region_code

ON CONFLICT (charge_element_id) DO UPDATE SET
charge_version_id=EXCLUDED.charge_version_id, external_id=EXCLUDED.external_id,
abstraction_period_start_day=EXCLUDED.abstraction_period_start_day,
abstraction_period_start_month=EXCLUDED.abstraction_period_start_month,
abstraction_period_end_day=EXCLUDED.abstraction_period_end_day,
abstraction_period_end_month=EXCLUDED.abstraction_period_end_month,
authorised_annual_quantity=EXCLUDED.authorised_annual_quantity,
season=EXCLUDED.season, season_derived=EXCLUDED.season_derived,
source=EXCLUDED.source, loss=EXCLUDED.loss, purpose_primary=EXCLUDED.purpose_primary,
purpose_secondary=EXCLUDED.purpose_secondary, purpose_tertiary=EXCLUDED.purpose_tertiary,
factors_overridden=EXCLUDED.factors_overridden,
billable_annual_quantity=EXCLUDED.billable_annual_quantity,
time_limited_start_date=EXCLUDED.time_limited_start_date,
time_limited_end_date=EXCLUDED.time_limited_end_date,
description=EXCLUDED.description, date_updated=EXCLUDED.date_updated;`;

// Deletes charge elements that are no longer present in the NALD import
const cleanupChargeElements = `
DELETE FROM water.charge_elements
WHERE charge_element_id IN (
  SELECT e.charge_element_id FROM water_import.charge_elements e
  LEFT JOIN import."NALD_CHG_ELEMENTS" ie ON e.element_id=ie."ID"::integer AND e.region_code=ie."FGAC_REGION_CODE"::integer AND e.licence_id=ie."ACVR_AABL_ID"::integer AND e.version=ie."ACVR_VERS_NO"::integer
  WHERE ie."ID" IS NULL
)`;

const importChargeAgreements = `
INSERT INTO water.charge_agreements

(charge_agreement_id, charge_element_id, agreement_code, start_date,
end_date, signed_date, file_reference, description, date_created,
date_updated)

SELECT
  ia.charge_agreement_id,
  ie.charge_element_id,
  a."AFSA_CODE" AS agreement_code,
  to_date(a."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,

  case a."EFF_END_DATE"
    when 'null' then null
    else to_date(a."EFF_END_DATE", 'DD/MM/YYYY')
  end AS end_date,

  case a."SIGNED_DATE"
    when 'null' then null
    else to_date(a."SIGNED_DATE", 'DD/MM/YYYY')
  end AS signed_date,

  NULLIF(a."FILE_REF", 'null') AS file_reference,
  NULLIF(a."TEXT", 'null') AS description,
  NOW() AS date_created,
  NOW() AS date_updated

FROM import."NALD_CHG_AGRMNTS" a
  JOIN water_import.charge_agreements ia
    ON a."ACEL_ID"::integer = ia.element_id
      AND to_date(a."EFF_ST_DATE", 'DD/MM/YYYY') = ia.start_date
      AND a."FGAC_REGION_CODE"::integer=ia.region_code
      AND a."AFSA_CODE"=ia.afsa_code
  JOIN water_import.charge_elements ie
    ON a."ACEL_ID"::integer=ie.element_id
      AND a."FGAC_REGION_CODE"::integer=ie.region_code

ON CONFLICT (charge_agreement_id) DO UPDATE
SET
charge_element_id=EXCLUDED.charge_element_id, agreement_code=EXCLUDED.agreement_code,
start_date=EXCLUDED.start_date, end_date= EXCLUDED.end_date, signed_date=EXCLUDED.signed_date,
file_reference=EXCLUDED.file_reference, description=EXCLUDED.description, date_updated=EXCLUDED.date_updated`;

// Deletes charge agreements that are no longer present in the NALD import
const cleanupChargeAgreements = `
DELETE FROM water.charge_agreements WHERE charge_agreement_id IN (
  SELECT a.charge_agreement_id
  FROM water_import.charge_agreements a
    LEFT JOIN import."NALD_CHG_AGRMNTS" ia
      ON a.element_id=ia."ACEL_ID"::integer
        AND a.afsa_code=ia."AFSA_CODE"
        AND a.start_date=to_date(ia."EFF_ST_DATE", 'DD/MM/YYYY')
  WHERE ia."ACEL_ID" IS NULL
)`;

exports.createChargeVersionGuids = createChargeVersionGuids;
exports.createChargeElementGuids = createChargeElementGuids;
exports.createChargeAgreementGuids = createChargeAgreementGuids;
exports.importChargeVersions = importChargeVersions;
exports.cleanupChargeVersions = cleanupChargeVersions;
exports.importChargeElements = importChargeElements;
exports.cleanupChargeElements = cleanupChargeElements;
exports.importChargeAgreements = importChargeAgreements;
exports.cleanupChargeAgreements = cleanupChargeAgreements;
