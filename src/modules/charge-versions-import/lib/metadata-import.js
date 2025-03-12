'use strict'

const db = require('../../../lib/connectors/db.js')
const mapper = require('./mapper.js')

async function go (licenceData) {
  // Note: charge versions are already sorted by start date, version number from the DB query
  const chargeVersions = await _getNonDraftChargeVersions(licenceData.FGAC_REGION_CODE, licenceData.ID)

  // Stop here if there are no NALD charge versions (NALD_CHG_VERSIONS)
  if (!chargeVersions || chargeVersions.length === 0) {
    return
  }

  // Map to WRLS charge versions
  const wrlsChargeVersions = mapper.mapNALDChargeVersionsToWRLS(licenceData, chargeVersions)

  await _persistChargeVersionMetadata(wrlsChargeVersions)
  await _cleanup(licenceData, wrlsChargeVersions)
}

async function _getNonDraftChargeVersions (regionCode, licenceId) {
  // This query is used to populate the `water_import.charge_versions_metadata` table. The
  // src/modules/charging-import/jobs/charge-versions.js job then creates or updates charge versions based on it.
  const params = [regionCode, licenceId]
  const query = `
    SELECT
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
  return db.query(query, params)
}

/**
 * Inserts a single charge version record into the water.charge_versions DB table
 * @param {Object} chargeVersion
 * @return {Promise}
 */
async function _insertChargeVersionMetadata (chargeVersion) {
  const params = [
    chargeVersion.external_id,
    chargeVersion.version_number,
    chargeVersion.start_date,
    chargeVersion.end_date,
    chargeVersion.status,
    chargeVersion.is_nald_gap || false
  ]
  const query = `
    insert into water_import.charge_versions_metadata
    (external_id, version_number, start_date, end_date, status, is_nald_gap, date_created)
    values ($1, $2, $3, $4, $5, $6, NOW())
    on conflict (external_id) do update set
      version_number=EXCLUDED.version_number,
      start_date=EXCLUDED.start_date,
      end_date=EXCLUDED.end_date,
      status=EXCLUDED.status,
      is_nald_gap=EXCLUDED.is_nald_gap,
      date_updated=NOW();
  `

  await db.query(query, params)
}

function _createParam (i) {
  return `$${i + 1}`
}

async function _cleanup (licenceData, chargeVersions) {
  const params = [`${licenceData.FGAC_REGION_CODE}:${licenceData.ID}:%`]
  const externalIds = chargeVersions.map(chargeVersion => chargeVersion.external_id)

  let query = 'delete from water_import.charge_versions_metadata where external_id like $1'

  if (externalIds.length) {
    params.push(...externalIds)
    query += ` and external_id not in (${externalIds.map((row, i) => _createParam(i + 1))})`
  }

  await db.query(query, params)
}

const _persistChargeVersionMetadata = async wrlsChargeVersions => {
  // Insert to water.charge_versions DB table
  for (const wrlsChargeVersion of wrlsChargeVersions) {
    await _insertChargeVersionMetadata(wrlsChargeVersion)
  }
}

module.exports = {
  go
}
