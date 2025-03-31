'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await _modLogs()
    await _points()
    await _purposeConditionTypes()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'reference-data-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('reference-data-import: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _modLogs () {
  // This will attempt to import all mod log records that are not impoundment licence related. For those that it has
  // already imported it will do nothing (see the ON CONFLICT). Mod log records cannot be changed after they have been
  // created so we don't waste any time updating anything.
  await db.query(`
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
  `)
}

async function _points () {
  await db.query(`
    INSERT INTO water.points (
      description,
      ngr_1,
      ngr_2,
      ngr_3,
      ngr_4,
      source_id,
      category,
      primary_type,
      secondary_type,
      note,
      location_note,
      "depth",
      bgs_reference,
      well_reference,
      hydro_reference,
      hydro_intercept_distance,
      hydro_offset_distance,
      external_id
    )
    SELECT
      np."LOCAL_NAME" AS description,
      concat_ws(' ', np."NGR1_SHEET", np."NGR1_EAST", np."NGR1_NORTH") AS ngr_1,
      (CASE np."NGR2_SHEET" WHEN 'null' THEN null ELSE concat_ws(' ', np."NGR2_SHEET", np."NGR2_EAST", np."NGR2_NORTH") END) AS ngr_2,
      (CASE np."NGR3_SHEET" WHEN 'null' THEN null ELSE concat_ws(' ', np."NGR3_SHEET", np."NGR3_EAST", np."NGR3_NORTH") END) AS ngr_3,
      (CASE np."NGR4_SHEET" WHEN 'null' THEN null ELSE concat_ws(' ', np."NGR4_SHEET", np."NGR4_EAST", np."NGR4_NORTH") END) AS ngr_4,
      s.id AS source_id,
      npc."DESCR" AS category,
      nptp."DESCR" AS primary_type,
      npts."DESCR" AS secondary_type,
      (CASE np."NOTES" WHEN 'null' THEN NULL ELSE np."NOTES" END) AS note,
      (CASE np."LOCATION_TEXT" WHEN 'null' THEN NULL ELSE np."LOCATION_TEXT" END) AS location_note,
      (CASE np."DEPTH" WHEN 'null' THEN 0 ELSE np."DEPTH"::decimal END) AS "depth",
      (CASE np."BGS_NO" WHEN 'null' THEN NULL ELSE np."BGS_NO" END) AS "bgs_reference",
      (CASE np."REG_WELL_INDEX_REF" WHEN 'null' THEN NULL ELSE np."REG_WELL_INDEX_REF" END) AS well_reference,
      (CASE np."HYDRO_REF" WHEN 'null' THEN NULL ELSE np."HYDRO_REF" END) AS hydro_reference,
      (CASE np."HYDRO_INTERCEPT_DIST" WHEN 'null' THEN 0 ELSE np."HYDRO_INTERCEPT_DIST"::decimal END) AS hydro_intercept_distance,
      (CASE np."HYDRO_GW_OFFSET_DIST" WHEN 'null' THEN 0 ELSE np."HYDRO_GW_OFFSET_DIST"::decimal END) AS hydro_offset_distance,
      concat_ws(':', np."FGAC_REGION_CODE", np."ID") AS external_id
    FROM
      "import"."NALD_POINTS" np
    INNER JOIN
      water.sources s ON s.legacy_id = np."ASRC_CODE"
    LEFT JOIN
      "import"."NALD_POINT_CATEGORIES" npc ON npc."CODE" = np."AAPC_CODE"
    LEFT JOIN
      "import"."NALD_POINT_TYPE_PRIMS" nptp ON nptp."CODE" = np."AAPT_APTP_CODE"
    LEFT JOIN
      "import"."NALD_POINT_TYPE_SECS" npts ON npts."CODE"  = np."AAPT_APTS_CODE"
    ON CONFLICT(external_id)
    DO UPDATE
    SET
      description = excluded.description,
      ngr_1 = excluded.ngr_1,
      ngr_2 = excluded.ngr_2,
      ngr_3 = excluded.ngr_3,
      ngr_4 = excluded.ngr_4,
      source_id = excluded.source_id,
      category = excluded.category,
      primary_type = excluded.primary_type,
      secondary_type = excluded.secondary_type,
      note = excluded.note,
      location_note = excluded.location_note,
      "depth" = excluded."depth",
      bgs_reference = excluded.bgs_reference,
      well_reference = excluded.well_reference,
      hydro_reference = excluded.hydro_reference,
      hydro_intercept_distance = excluded.hydro_intercept_distance,
      hydro_offset_distance = excluded.hydro_offset_distance;
  `)
}

async function _purposeConditionTypes () {
  await db.query(`
    INSERT INTO water.licence_version_purpose_condition_types (
      code,
      subcode,
      description,
      subcode_description
    )
    SELECT
      "CODE",
      "SUBCODE",
      "DESCR",
      "SUBCODE_DESC"
    FROM
      "import"."NALD_LIC_COND_TYPES"
    WHERE
      "AFFECTS_ABS" = 'Y'
    ON CONFLICT (code, subcode)
    DO UPDATE SET
      description = excluded.description,
      subcode_description = excluded.subcode_description,
      date_updated = now();
  `)
}

module.exports = {
  go
}
