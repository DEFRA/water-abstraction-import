'use strict';

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
  date_updated=NOW();
`;

const importChargeVersions = `INSERT INTO water.charge_versions (licence_ref, scheme, external_id, version_number, start_date, status, apportionment,
error, end_date, billed_upto_date, region_code, date_created, date_updated, source, invoice_account_id, company_id, licence_id, change_reason_id)
SELECT
  l."LIC_NO" AS licence_ref,
  'alcs' AS scheme,
  cvm.external_id as external_id,
  cvm.version_number,
  cvm.start_date AS start_date,
  cvm.status::varchar::water.charge_version_status,
CASE sub."APPORTIONMENT"
  WHEN 'Y' THEN true
  WHEN 'N' THEN false
END AS apportionment,
CASE sub."IN_ERROR_STATUS"
  WHEN 'Y' THEN true
  WHEN 'N' THEN false
END AS error,
cvm.end_date AS end_date,
to_date(nullif(sub."BILLED_UPTO_DATE", 'null'), 'DD/MM/YYYY') as billed_upto_date,
split_part(cvm.external_id, ':', 1)::integer as region,
NOW() AS date_created,
NOW() AS date_updated,
'nald' AS source,
sub.invoice_account_id,
sub.company_id,
wl.licence_id,
CASE cvm.is_nald_gap
  WHEN TRUE THEN cr.change_reason_id
  ELSE NULL
END AS change_reason_id
FROM water_import.charge_versions_metadata cvm
LEFT JOIN (
  SELECT v.*, c.company_id, ia.invoice_account_id, concat_ws(':', v."FGAC_REGION_CODE", v."AABL_ID", v."VERS_NO") as external_id
  FROM import."NALD_CHG_VERSIONS" v 
  JOIN crm_v2.invoice_accounts ia ON ia.invoice_account_number=v."AIIA_IAS_CUST_REF"
  JOIN import."NALD_LH_ACCS" lha ON v."AIIA_ALHA_ACC_NO"=lha."ACC_NO" AND v."FGAC_REGION_CODE"=lha."FGAC_REGION_CODE"
  JOIN crm_v2.companies c ON c.external_id=concat_ws(':', lha."FGAC_REGION_CODE", lha."ACON_APAR_ID")
) sub on cvm.external_id=sub.external_id
JOIN import."NALD_ABS_LICENCES" l ON split_part(cvm.external_id, ':', 1)=l."FGAC_REGION_CODE" and split_part(cvm.external_id, ':', 2)=l."ID"
JOIN water.licences wl on wl.licence_ref = l."LIC_NO"
JOIN water.change_reasons cr on cr.description='NALD gap'
ON CONFLICT (external_id) DO UPDATE SET licence_ref=EXCLUDED.licence_ref,
scheme=EXCLUDED.scheme,
version_number=EXCLUDED.version_number, start_date=EXCLUDED.start_date,
status=EXCLUDED.status, apportionment=EXCLUDED.apportionment,
error=EXCLUDED.error, end_date=EXCLUDED.end_date,
billed_upto_date=EXCLUDED.billed_upto_date,
region_code=EXCLUDED.region_code, date_updated=EXCLUDED.date_updated,
source=EXCLUDED.source, invoice_account_id=EXCLUDED.invoice_account_id, company_id=EXCLUDED.company_id,
licence_Id=EXCLUDED.licence_id, change_reason_id=EXCLUDED.change_reason_id;`;

// Deletes charge versions that are no longer present in the NALD import
const cleanupChargeVersions = `
DELETE FROM water.charge_versions WHERE charge_version_id IN (
  select cv.charge_version_id
    from water.charge_versions cv
        left join water.billing_batch_charge_version_years on cv.charge_version_id = billing_batch_charge_version_years.charge_version_id
    left join water_import.charge_versions_metadata cvm on cvm.external_id = cv.external_id
    where cv.source='nald'
      and cvm.external_id is null
    and billing_batch_charge_version_year_id is null
);`;

/**
 * This query deletes TPT licence agreements that were imported via the
 * original implementation.  These have no external ID set.
 */
const cleanupTwoPartTariffAgreementsWithoutExternalId = `
delete from water.licence_agreements la
  using water.financial_agreement_types fat 
  where 
    la.financial_agreement_type_id=fat.financial_agreement_type_id
    and fat.financial_agreement_code='S127'
    and la.external_id is null;
`;

const getTwoPartTariffAgreements = `
select 
  nl."LIC_NO" as licence_ref,
  fat.financial_agreement_type_id,
  -- Start date is charge version start date or agreement start date, whichever is later
  greatest(
    to_date(ncv."EFF_ST_DATE", 'DD/MM/YYYY'), 
    to_date(nca."EFF_ST_DATE", 'DD/MM/YYYY')
  ) as start_date,
  -- End date is charge version end date or agreement end date, whichever is earlier
  least(
    to_date(nullif(ncv."EFF_END_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(nullif(nca."EFF_END_DATE", 'null'), 'DD/MM/YYYY')
  ) as end_date,
  to_date(nullif(nca."SIGNED_DATE", 'null'), 'DD/MM/YYYY') as date_signed,
  pu.purpose_use_id,
  -- Calculate a legacy ID which can be used for upserting the licence agreements
  concat_ws(':', 
    ncv."FGAC_REGION_CODE",
    ncv."AABL_ID",
    ncv."VERS_NO",
    nca."AFSA_CODE"
  ) as external_id
from import."NALD_CHG_VERSIONS" ncv
join import."NALD_ABS_LICENCES" nl on ncv."FGAC_REGION_CODE"=nl."FGAC_REGION_CODE" and ncv."AABL_ID"=nl."ID"
join import."NALD_CHG_ELEMENTS" nce on ncv."FGAC_REGION_CODE"=nce."FGAC_REGION_CODE" and ncv."AABL_ID"=nce."ACVR_AABL_ID" and ncv."VERS_NO"=nce."ACVR_VERS_NO"
join import."NALD_CHG_AGRMNTS" nca on nce."FGAC_REGION_CODE"=nca."FGAC_REGION_CODE" and nce."ID"=nca."ACEL_ID"
join water.purposes_uses pu on nce."APUR_APUS_CODE"=pu.legacy_id
join water.financial_agreement_types fat on nca."AFSA_CODE"=fat.financial_agreement_code
where concat_ws(':', 
  ncv."FGAC_REGION_CODE", 
  ncv."AABL_ID", 
  ncv."VERS_NO"
) in (
  -- Finds the charge versions to select.  
  -- Draft charge versions are omitted.
  -- Where multiple charge versions begin on the same date, 
  -- pick the one with the greatest version number.
  select concat_ws(':', 
    ncv."FGAC_REGION_CODE", 
    ncv."AABL_ID", 
    max(ncv."VERS_NO"::integer)::varchar
  ) as id
  from import."NALD_CHG_VERSIONS" ncv
  where ncv."STATUS"<>'DRAFT'
  group by ncv."FGAC_REGION_CODE", ncv."AABL_ID", ncv."EFF_ST_DATE"
)
-- Omit agreements where the calculated start date of the 
-- agreement is outside the date range of the charge version
and daterange(
  to_date(ncv."EFF_ST_DATE", 'DD/MM/YYYY'),
  to_date(nullif(ncv."EFF_END_DATE", 'null'), 'DD/MM/YYYY'),
  '[]'
) @> greatest(
    to_date(ncv."EFF_ST_DATE", 'DD/MM/YYYY'), 
    to_date(nca."EFF_ST_DATE", 'DD/MM/YYYY')
)
`;

const importTwoPartTariffAgreements = `
insert into water.licence_agreements (
  licence_ref, start_date, end_date, 
  date_signed, financial_agreement_type_id, external_id,
  date_created, date_updated
)
select 
  la.licence_ref, 
  min(la.start_date) as start_date,
  max(la.end_date) as end_date,
  min(la.date_signed) as date_signed,
  la.financial_agreement_type_id,
  la.external_id,
  NOW() as date_created,
  NOW() as date_updated
from (
  ${getTwoPartTariffAgreements}
) la
group by la.external_id, la.licence_ref, la.financial_agreement_type_id 
on conflict (external_id) do update set
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  date_signed=EXCLUDED.date_signed,
  financial_agreement_type_id=EXCLUDED.financial_agreement_type_id,
  date_updated=EXCLUDED.date_updated;
`;

exports.importChargeElements = importChargeElements;
exports.cleanupChargeElements = cleanupChargeElements;
exports.insertChargeVersion = insertChargeVersion;
exports.importChargeVersions = importChargeVersions;
exports.cleanupChargeVersions = cleanupChargeVersions;
