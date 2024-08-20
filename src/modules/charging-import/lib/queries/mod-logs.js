'use strict'

// This will attempt to import all mod log records that are not impoundment licence related. For those that it has
// already imported it will do nothing (see the ON CONFLICT). Mod log records cannot be changed after they have been
// created so we don't waste any time updating anything.
const importModLogs = `
  INSERT INTO water.mod_logs
  (external_id, event_code, event_description, reason_type, reason_code, reason_description, nald_date, user_id, note, licence_ref, licence_external_id, licence_version_external_id, charge_version_external_id, return_version_external_id)
  SELECT
    (concat_ws(':', fml.region_code, fml.mod_log_id)) AS external_id,
    event_code,
    event_description,
    reason_type,
    reason_code,
    reason_description,
    nald_date,
    user_id,
    note,
    fml.licence_ref AS licence_ref,
    (concat_ws(':', fml.region_code, fml.licence_id)) AS licence_external_id,
    (CASE WHEN fml.licence_version_id IS NULL THEN NULL ELSE concat_ws(':', fml.region_code, fml.licence_version_id, fml.licence_version_issue_no, fml.licence_version_increment_no) END) AS licence_version_external_id,
    (CASE WHEN fml.charge_version_id IS NULL THEN NULL ELSE concat_ws(':', fml.region_code, fml.charge_version_id, fml.charge_version_no) END) AS charge_version_external_id,
    (CASE WHEN fml.return_version_id IS NULL THEN NULL ELSE concat_ws(':', fml.region_code, fml.return_version_id, fml.return_version_no) END) AS return_version_external_id
  FROM (
    SELECT
      nml."ID" AS mod_log_id,
      nml."FGAC_REGION_CODE" AS region_code,
      nml."EVENT" AS event_code,
      events."RV_MEANING" AS event_description,
      nmr."AMRE_TYPE" AS reason_type,
      nmr."CODE" AS reason_code,
      nmr."DESCR" AS reason_description,
      (CASE nml."CREATE_DATE" WHEN 'null' THEN NULL ELSE to_date(nml."CREATE_DATE", 'DD/MM/YYYY') END) AS nald_date,
      nml."USER_ID" AS user_id,
      (CASE nml."TEXT" WHEN 'null' THEN NULL ELSE nml."TEXT" END) AS note,
      (CASE nml."AABL_ID" WHEN 'null' THEN NULL ELSE nml."AABL_ID" END) AS licence_id,
      nal."LIC_NO" AS licence_ref,
      (CASE nml."AABV_AABL_ID" WHEN 'null' THEN NULL ELSE nml."AABV_AABL_ID" END) AS licence_version_id,
      (CASE nml."AABV_ISSUE_NO" WHEN 'null' THEN NULL ELSE nml."AABV_ISSUE_NO" END) AS licence_version_issue_no,
      (CASE nml."AABV_INCR_NO" WHEN 'null' THEN NULL ELSE nml."AABV_INCR_NO" END) AS licence_version_increment_no,
      (CASE nml."ACVR_AABL_ID" WHEN 'null' THEN NULL ELSE nml."ACVR_AABL_ID" END) AS charge_version_id,
      (CASE nml."ACVR_VERS_NO" WHEN 'null' THEN NULL ELSE nml."ACVR_VERS_NO" END) AS charge_version_no,
      (CASE nml."ARVN_AABL_ID" WHEN 'null' THEN NULL ELSE nml."ARVN_AABL_ID" END) AS return_version_id,
      (CASE nml."ARVN_VERS_NO" WHEN 'null' THEN NULL ELSE nml."ARVN_VERS_NO" END) AS return_version_no
    FROM "import"."NALD_MOD_LOGS" nml -- nald mod logs
    LEFT JOIN "import"."NALD_ABS_LICENCES" nal ON nal."ID" = nml."AABL_ID" AND nal."FGAC_REGION_CODE" = nml."FGAC_REGION_CODE"
    LEFT JOIN "import"."NALD_MOD_REASONS" nmr ON nmr."AMRE_TYPE" = nml."AMRE_AMRE_TYPE" AND nmr."CODE" = nml."AMRE_CODE"
    LEFT JOIN (
      SELECT nrc."RV_LOW_VALUE", nrc."RV_MEANING" FROM "import"."NALD_REF_CODES" nrc WHERE nrc."RV_DOMAIN" = 'EVENT'
    ) events ON events."RV_LOW_VALUE" = nml."EVENT"
    WHERE
      -- ignore impoundment licences
      nml."AIMP_ID" = 'null'
      AND nml."AIMV_AIMP_ID" = 'null'
  ) fml --formatted nald mod logs;
  ON CONFLICT(external_id) DO NOTHING;
`

// This will link any newly imported mod log records to their licences based on licence ref (WRLS licence records don't
// have an external_id like the other tables)
const linkLicencesToModLogs = `
  UPDATE water.mod_logs ml
  SET licence_id = l.licence_id
  FROM water.licences l
  WHERE l.licence_ref = ml.licence_ref
  AND ml.licence_id IS NULL;
`

// This will link any newly imported mod log records to their charge versions based on the external ID against each one
const linkChargeVersionsToModLogs = `
  UPDATE water.mod_logs ml
  SET charge_version_id = cv.charge_version_id
  FROM water.charge_versions cv
  WHERE cv.external_id = ml.charge_version_external_id
  AND ml.charge_version_id IS NULL;
`

// This will link any newly imported mod log records to their licence versions based on the external ID against each one
const linkLicenceVersionsToModLogs = `
  UPDATE water.mod_logs ml
  SET licence_version_id = lv.licence_version_id
  FROM water.licence_versions lv
  WHERE lv.external_id = ml.licence_version_external_id
  AND ml.licence_version_id IS NULL;
`

// This will link any newly imported mod log records to their return versions based on the external ID against each one
const linkReturnVersionsToModLogs = `
  UPDATE water.mod_logs ml
  SET return_version_id = rv.return_version_id
  FROM water.return_versions rv
  WHERE rv.external_id = ml.return_version_external_id
  AND ml.return_version_id IS NULL;
`

// NOTE: Initial attempts to create this query were too slow. The issue is that a return version can be linked to
// multiple mod log records. We were using a sub-query with a limit and these 2 approaches were the root cause.
// Thankfully, we find only the originating entry seems to have a reason code when there are multiple mod logs. That was
// the primary reason for using a sub-query. Chat-GPT suggested we tried using a common table expression (CTE) to create
// a table we then JOIN to in the update rather than a sub-query. CTEs are temporary tables that exist just within the
// scope of the query.
//
// This was a massive performance boost (> 10 mins to < 5 secs) for the first run. AFter that the timing comes down to
// milliseconds.
const updateReturnVersionReasons = `
  WITH selected_reasons AS (
    SELECT
      ml.return_version_id,
      CASE
        WHEN ml.reason_code = 'AMND' THEN NULL
        WHEN ml.reason_code = 'MIGR' THEN NULL
        WHEN ml.reason_code = 'NAME' THEN 'name-or-address-change'
        WHEN ml.reason_code = 'NEWL' THEN 'new-licence'
        WHEN ml.reason_code = 'NEWP' THEN 'new-licence-in-part-succession-or-licence-apportionment'
        WHEN ml.reason_code = 'REDS' THEN NULL
        WHEN ml.reason_code = 'SPAC' THEN 'change-to-special-agreement'
        WHEN ml.reason_code = 'SPAN' THEN 'new-special-agreement'
        WHEN ml.reason_code = 'SREM' THEN 'succession-to-remainder-licence-or-licence-apportionment'
        WHEN ml.reason_code = 'SUCC' THEN 'succession-or-transfer-of-licence'
        WHEN ml.reason_code = 'VARF' THEN 'major-change'
        WHEN ml.reason_code = 'VARM' THEN 'minor-change'
        WHEN ml.reason_code = 'XCORR' THEN 'error-correction'
        WHEN ml.reason_code = 'XRET' THEN 'change-to-return-requirements'
        WHEN ml.reason_code = 'XRETM' THEN 'change-to-return-requirements'
        ELSE NULL
      END AS mapped_reason
    FROM
      water.mod_logs ml
    JOIN
      water.return_versions rv ON rv.return_version_id = ml.return_version_id
    WHERE
      ml.reason_code IN ('NAME', 'NEWL', 'NEWP', 'SPAC', 'SPAN', 'SREM', 'SUCC', 'VARF', 'VARM', 'XCORR', 'XRET', 'XRETM')
      AND rv.reason IS NULL
    ORDER BY
      ml.external_id ASC
  )
  UPDATE water.return_versions rv
  SET reason = sr.mapped_reason
  FROM selected_reasons sr
  WHERE rv.return_version_id = sr.return_version_id
  AND rv.reason IS NULL;
`

module.exports = {
  importModLogs,
  linkLicencesToModLogs,
  linkChargeVersionsToModLogs,
  linkLicenceVersionsToModLogs,
  linkReturnVersionsToModLogs,
  updateReturnVersionReasons
}
