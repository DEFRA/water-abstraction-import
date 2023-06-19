'use strict'

// This query is used to populate the `water_import.charge_versions_metadata` table. The
// src/modules/charging-import/jobs/charge-versions.js job then creates or updates charge versions based on it.
//
// Check out the module for more notes about the context for this query.
const getNonDraftChargeVersionsForLicence = `SELECT
  l."LIC_NO" AS licence_ref,
  wl.licence_id,
  ('alcs') AS scheme,
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
JOIN water.licences wl ON l."LIC_NO"=wl.licence_ref
WHERE v."FGAC_REGION_CODE"=$1
and v."AABL_ID"=$2
and v."STATUS"<>'DRAFT'
and to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') < '2022-04-01'::date
ORDER BY
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY'),
  v."VERS_NO"::integer;
`

module.exports = {
  getNonDraftChargeVersionsForLicence
}
