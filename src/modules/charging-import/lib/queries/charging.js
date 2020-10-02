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
error, end_date, billed_upto_date, region_code, date_created, date_updated, source, invoice_account_id, company_id)
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
'nald' AS source,
ia.invoice_account_id,
c.company_id
FROM import."NALD_CHG_VERSIONS" v
JOIN water_import.charge_versions cv ON v."AABL_ID"::integer=cv.licence_id AND v."FGAC_REGION_CODE"::integer=cv.region_code AND v."VERS_NO"::integer=cv.version
JOIN import."NALD_ABS_LICENCES" l ON v."AABL_ID"=l."ID" AND v."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"
JOIN crm_v2.invoice_accounts ia ON ia.invoice_account_number=v."AIIA_IAS_CUST_REF" 
JOIN import."NALD_LH_ACCS" lha ON v."AIIA_ALHA_ACC_NO"=lha."ACC_NO" AND v."FGAC_REGION_CODE"=lha."FGAC_REGION_CODE"
JOIN crm_v2.companies c ON c.external_id=concat_ws(':', lha."FGAC_REGION_CODE", lha."ACON_APAR_ID")
ON CONFLICT (charge_version_id) DO UPDATE SET
licence_ref=EXCLUDED.licence_ref, scheme=EXCLUDED.scheme, external_id=EXCLUDED.external_id,
version_number=EXCLUDED.version_number, start_date=EXCLUDED.start_date,
status=EXCLUDED.status, apportionment=EXCLUDED.apportionment,
error=EXCLUDED.error, end_date=EXCLUDED.end_date,
billed_upto_date=EXCLUDED.billed_upto_date,
region_code=EXCLUDED.region_code, date_updated=EXCLUDED.date_updated,
source=EXCLUDED.source, invoice_account_id=EXCLUDED.invoice_account_id, company_id=EXCLUDED.company_id;`;

// Deletes charge versions that are no longer present in the NALD import
const cleanupChargeVersions = `
DELETE FROM water.charge_versions WHERE charge_version_id IN (
  select cv.charge_version_id 
    from water.charge_versions cv 
      left join water.billing_batch_charge_versions bcv on cv.charge_version_id=bcv.charge_version_id
      left join import."NALD_CHG_VERSIONS" ncv on cv.region_code=ncv."FGAC_REGION_CODE"::integer and cv.external_id=ncv."AABL_ID"::integer and cv.version_number=ncv."VERS_NO"::integer
    where cv.source='nald'
      and bcv.billing_batch_charge_version_id is null
      and ncv."AABL_ID" is null
);`;

const importChargeElements = `
INSERT INTO water.charge_elements
(charge_element_id, charge_version_id, external_id, abstraction_period_start_day, abstraction_period_start_month,
abstraction_period_end_day, abstraction_period_end_month, authorised_annual_quantity, season, season_derived,
source, loss, purpose_primary_id, purpose_secondary_id, purpose_use_id, factors_overridden, billable_annual_quantity,
time_limited_start_date, time_limited_end_date, description, date_created, date_updated) SELECT ie.charge_element_id, iv.charge_version_id, e."ID"::integer AS external_id,
e."ABS_PERIOD_ST_DAY"::integer AS abstraction_period_start_day,
e."ABS_PERIOD_ST_MONTH"::integer AS abstraction_period_start_month,
e."ABS_PERIOD_END_DAY"::integer AS abstraction_period_end_day,
e."ABS_PERIOD_END_MONTH"::integer AS abstraction_period_end_month,
e."AUTH_ANN_QTY"::numeric AS authorised_annual_quantity, (CASE e."ASFT_CODE"
  WHEN 'S' THEN 'summer'
  WHEN 'W' THEN 'winter'
  WHEN 'A' THEN 'all year'
END)::water.charge_element_season AS season, (CASE e."ASFT_CODE_DERIVED"
  WHEN 'S' THEN 'summer'
  WHEN 'W' THEN 'winter'
  WHEN 'A' THEN 'all year'
END)::water.charge_element_season AS season_derived, (CASE e."ASRF_CODE"
  WHEN 'S' THEN 'supported'
  WHEN 'U' THEN 'unsupported'
  WHEN 'K' THEN 'kielder'
  WHEN 'T' THEN 'tidal'
END)::water.charge_element_source AS source, (CASE e."ALSF_CODE"
  WHEN 'H' THEN 'high'
  WHEN 'M' THEN 'medium'
  WHEN 'L' THEN 'low'
  WHEN 'V' THEN 'very low'
  WHEN 'N' THEN 'non-chargeable'
END)::water.charge_element_loss AS loss, pp.purpose_primary_id,
ps.purpose_secondary_id,
pu.purpose_use_id, e."FCTS_OVERRIDDEN"::boolean AS factors_overridden, NULLIF(e."BILLABLE_ANN_QTY", 'null')::numeric AS billable_annual_quantity, case e."TIMELTD_ST_DATE"
    when 'null' then null
    else to_date(e."TIMELTD_ST_DATE", 'DD/MM/YYYY')
  end AS time_limited_start_date, case e."TIMELTD_END_DATE"
    when 'null' then null
    else to_date(e."TIMELTD_END_DATE", 'DD/MM/YYYY')
  end AS time_limited_end_date, NULLIF(e."DESCR", 'null') AS description, NOW() AS date_created,  NOW() AS date_updated FROM import."NALD_CHG_ELEMENTS" e
JOIN water_import.charge_elements ie ON e."ID"::integer=ie.element_id AND e."ACVR_AABL_ID"::integer = ie.licence_id AND e."FGAC_REGION_CODE"::integer = ie.region_code
JOIN water_import.charge_versions iv ON e."ACVR_AABL_ID"::integer=iv.licence_id AND e."ACVR_VERS_NO"::integer=iv.version AND e."FGAC_REGION_CODE"::integer = iv.region_code
JOIN water.charge_versions v on iv.charge_version_id=v.charge_version_id 
JOIN water.purposes_primary pp on e."APUR_APPR_CODE"=pp.legacy_id
JOIN water.purposes_secondary ps on e."APUR_APSE_CODE"=ps.legacy_id
JOIN water.purposes_uses pu on e."APUR_APUS_CODE"=pu.legacy_id ON CONFLICT (charge_element_id) DO UPDATE SET
charge_version_id=EXCLUDED.charge_version_id, 
external_id=EXCLUDED.external_id,
abstraction_period_start_day=EXCLUDED.abstraction_period_start_day,
abstraction_period_start_month=EXCLUDED.abstraction_period_start_month,
abstraction_period_end_day=EXCLUDED.abstraction_period_end_day,
abstraction_period_end_month=EXCLUDED.abstraction_period_end_month,
authorised_annual_quantity=EXCLUDED.authorised_annual_quantity,
season=EXCLUDED.season, season_derived=EXCLUDED.season_derived,
source=EXCLUDED.source, loss=EXCLUDED.loss, 
purpose_primary_id=EXCLUDED.purpose_primary_id,
purpose_secondary_id=EXCLUDED.purpose_secondary_id, 
purpose_use_id=EXCLUDED.purpose_use_id,
factors_overridden=EXCLUDED.factors_overridden,
billable_annual_quantity=EXCLUDED.billable_annual_quantity,
time_limited_start_date=EXCLUDED.time_limited_start_date,
time_limited_end_date=EXCLUDED.time_limited_end_date,
description=EXCLUDED.description, 
date_updated=EXCLUDED.date_updated;
;`;

// Deletes charge elements that are no longer present in the NALD import
const cleanupChargeElements = `
DELETE FROM water.charge_elements
WHERE charge_element_id IN (
  select ce.charge_element_id from water.charge_elements ce
  join water.charge_versions cv on ce.charge_version_id=cv.charge_version_id
  left join import."NALD_CHG_ELEMENTS" nce on cv.region_code=nce."FGAC_REGION_CODE"::integer and ce.external_id=nce."ID"::integer
  left join water.billing_transactions t on ce.charge_element_id=t.charge_element_id
  where cv.source='nald'
    and nce."ID" is null 
    and t.billing_transaction_id is null
);`;

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
WHERE a."AFSA_CODE" NOT IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W') 
ON CONFLICT (charge_agreement_id) DO UPDATE
SET
charge_element_id=EXCLUDED.charge_element_id, agreement_code=EXCLUDED.agreement_code,
start_date=EXCLUDED.start_date, end_date= EXCLUDED.end_date, signed_date=EXCLUDED.signed_date,
file_reference=EXCLUDED.file_reference, description=EXCLUDED.description, date_updated=EXCLUDED.date_updated`;

exports.createChargeVersionGuids = createChargeVersionGuids;
exports.createChargeElementGuids = createChargeElementGuids;
exports.createChargeAgreementGuids = createChargeAgreementGuids;
exports.importChargeVersions = importChargeVersions;
exports.cleanupChargeVersions = cleanupChargeVersions;
exports.importChargeElements = importChargeElements;
exports.cleanupChargeElements = cleanupChargeElements;
exports.importChargeAgreements = importChargeAgreements;
