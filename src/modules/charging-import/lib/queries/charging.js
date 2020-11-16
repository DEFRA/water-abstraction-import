'use strict';

// Deletes charge versions that are no longer present in the NALD import
const cleanupChargeVersions = `DELETE FROM water.charge_versions WHERE charge_version_id IN (
  select cv.charge_version_id 
    from water.charge_versions cv 
      left join water.billing_batch_charge_version_years bcvy on cv.charge_version_id=bcvy.charge_version_id
      left join import."NALD_CHG_VERSIONS" ncv on concat_ws(':', ncv."FGAC_REGION_CODE", ncv."AABL_ID", ncv."VERS_NO")=cv.external_id
    where cv.source='nald'
      and bcvy.billing_batch_charge_version_year_id is null
      and ncv."AABL_ID" is null
      and external_id is null
);`;

const importChargeElements = `INSERT INTO water.charge_elements
(charge_version_id, external_id, abstraction_period_start_day, abstraction_period_start_month,
abstraction_period_end_day, abstraction_period_end_month, authorised_annual_quantity, season, season_derived,
source, loss, purpose_primary_id, purpose_secondary_id, purpose_use_id, factors_overridden, billable_annual_quantity,
time_limited_start_date, time_limited_end_date, description, date_created, date_updated) 
SELECT v.charge_version_id, 
concat_ws(':', e."FGAC_REGION_CODE", e."ID") as external_id,
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
  end AS time_limited_end_date, NULLIF(e."DESCR", 'null') AS description, NOW() AS date_created,  NOW() AS date_updated 
FROM import."NALD_CHG_ELEMENTS" e
JOIN water.charge_versions v on v.external_id=concat_ws(':', e."FGAC_REGION_CODE", e."ACVR_AABL_ID", e."ACVR_VERS_NO") 
JOIN water.purposes_primary pp on e."APUR_APPR_CODE"=pp.legacy_id
JOIN water.purposes_secondary ps on e."APUR_APSE_CODE"=ps.legacy_id
JOIN water.purposes_uses pu on e."APUR_APUS_CODE"=pu.legacy_id 
ON CONFLICT (external_id) DO UPDATE SET
charge_version_id=EXCLUDED.charge_version_id, 
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
date_updated=EXCLUDED.date_updated;`;

// Deletes charge elements that are no longer present in the NALD import
const cleanupChargeElements = `DELETE FROM water.charge_elements
WHERE charge_element_id IN (
  select ce.charge_element_id from water.charge_elements ce
  join water.charge_versions cv on ce.charge_version_id=cv.charge_version_id
  join import."NALD_CHG_ELEMENTS" nce on ce.external_id=concat_ws(':', nce."FGAC_REGION_CODE", nce."ID")
  left join water.billing_transactions t on ce.charge_element_id=t.charge_element_id
  left join water.billing_volumes bv on bv.charge_element_id=ce.charge_element_id
  where cv.source='nald'
    and nce."ID" is null 
    and t.billing_transaction_id is null
    and bv.billing_volume_id is null 
);`;

const importChargeAgreements = `INSERT INTO water.charge_agreements
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
WHERE a."AFSA_CODE" NOT IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W') ON CONFLICT (charge_agreement_id) DO UPDATE SET charge_element_id=EXCLUDED.charge_element_id,
agreement_code=EXCLUDED.agreement_code, start_date=EXCLUDED.start_date, end_date= EXCLUDED.end_date, signed_date=EXCLUDED.signed_date,
file_reference=EXCLUDED.file_reference, description=EXCLUDED.description, date_updated=EXCLUDED.date_updated;`;

const getNonDraftChargeVersionsForLicence = `SELECT
  l."LIC_NO" AS licence_ref,
  wl.licence_id,
  'alcs' AS scheme,
  concat_ws(':', v."FGAC_REGION_CODE", v."AABL_ID", v."VERS_NO") as external_id,
  v."VERS_NO"::integer AS version_number,
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,
(CASE v."STATUS"
  WHEN 'SUPER' THEN 'superseded'
  WHEN 'DRAFT' THEN 'draft'
  WHEN 'CURR' THEN 'current'
END)::water.charge_version_status AS status,
v."APPORTIONMENT"='Y' as apportionment,
v."IN_ERROR_STATUS"='Y' as error,
to_date(nullif(v."EFF_END_DATE", 'null'), 'DD/MM/YYYY') as end_date,
to_date(nullif(v."BILLED_UPTO_DATE", 'null'), 'DD/MM/YYYY') as billed_upto_date,
v."FGAC_REGION_CODE"::integer AS region,
'nald' AS source,
ia.invoice_account_id,
c.company_id
FROM import."NALD_CHG_VERSIONS" v
JOIN import."NALD_ABS_LICENCES" l ON v."AABL_ID"=l."ID" AND v."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"
JOIN crm_v2.invoice_accounts ia ON ia.invoice_account_number=v."AIIA_IAS_CUST_REF" 
JOIN import."NALD_LH_ACCS" lha ON v."AIIA_ALHA_ACC_NO"=lha."ACC_NO" AND v."FGAC_REGION_CODE"=lha."FGAC_REGION_CODE"
JOIN crm_v2.companies c ON c.external_id=concat_ws(':', lha."FGAC_REGION_CODE", lha."ACON_APAR_ID")
LEFT JOIN water.licences wl ON l."LIC_NO"=wl.licence_ref 
WHERE v."FGAC_REGION_CODE"=$1 and v."AABL_ID"=$2 and v."STATUS"<>'DRAFT'
ORDER BY 
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY'),
  v."VERS_NO"::integer
`;

const insertChargeVersion = `
insert into water.charge_versions
(start_date, end_date, status, licence_ref, region_code, source, version_number, invoice_account_id, company_id, 
  billed_upto_date, error, scheme, external_id, apportionment, change_reason_id, licence_id, date_created)
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
on conflict (external_id) do update set
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  status=EXCLUDED.status,
  licence_ref=EXCLUDED.licence_ref,
  region_code=EXCLUDED.region_code,
  source=EXCLUDED.source,
  version_number=EXCLUDED.version_number,
  invoice_account_id=EXCLUDED.invoice_account_id,
  company_id=EXCLUDED.company_id,
  billed_upto_date=EXCLUDED.billed_upto_date,
  error=EXCLUDED.error,
  scheme=EXCLUDED.scheme,
  apportionment=EXCLUDED.apportionment,
  change_reason_id=EXCLUDED.change_reason_id,
  date_updated=NOW()
`;

exports.cleanupChargeVersions = cleanupChargeVersions;
exports.importChargeElements = importChargeElements;
exports.cleanupChargeElements = cleanupChargeElements;
exports.importChargeAgreements = importChargeAgreements;
exports.getNonDraftChargeVersionsForLicence = getNonDraftChargeVersionsForLicence;
exports.insertChargeVersion = insertChargeVersion;
