'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  // This will attempt to import all mod log records that are not impoundment licence related and linked to 'live'
  // licences.
  //
  // For those that it has already imported it will do nothing (see the ON CONFLICT). Mod log records cannot be changed
  // after they have been created so we don't waste any time updating anything.
  await db.query(`WITH nald_mod_logs AS (
  SELECT
    nml."ID" AS mod_log_id,
    nml."FGAC_REGION_CODE" AS region_code,
    nml."EVENT" AS event_code,
    events."RV_MEANING" AS event_description,
    nmr."AMRE_TYPE" AS reason_type,
    nmr."CODE" AS reason_code,
    nmr."DESCR" AS reason_description,
    (CASE
      WHEN nml."CREATE_DATE" = 'null' THEN
        NULL
      ELSE
        to_date(nml."CREATE_DATE", 'DD/MM/YYYY')
    END) AS nald_date,
    nml."USER_ID" AS user_id,
    (CASE
        WHEN nml."TEXT" = 'null' THEN
          NULL
        ELSE
          nml."TEXT"
    END) AS note,
    (CASE
      WHEN nml."AABL_ID" = 'null' THEN
        NULL
      ELSE nml."AABL_ID"
    END) AS licence_id,
    nal."LIC_NO" AS licence_ref,
    (CASE
      WHEN nml."AABV_AABL_ID" = 'null' THEN
        NULL
      ELSE
        nml."AABV_AABL_ID"
    END) AS licence_version_id,
    (CASE
      WHEN nml."AABV_ISSUE_NO" = 'null' THEN
        NULL
      ELSE
        nml."AABV_ISSUE_NO"
      END) AS licence_version_issue_no,
    (CASE
      WHEN nml."AABV_INCR_NO" = 'null' THEN
        NULL
      ELSE
        nml."AABV_INCR_NO"
    END) AS licence_version_increment_no,
    (CASE
      WHEN nml."ACVR_AABL_ID" = 'null' THEN
        NULL
      ELSE nml."ACVR_AABL_ID"
    END) AS charge_version_id,
    (CASE
      WHEN nml."ACVR_VERS_NO" = 'null' THEN
        NULL
      ELSE
        nml."ACVR_VERS_NO"
    END) AS charge_version_no,
    (CASE
      WHEN nml."ARVN_AABL_ID" = 'null' THEN
        NULL
      ELSE
        nml."ARVN_AABL_ID"
    END) AS return_version_id,
    (CASE
        WHEN nml."ARVN_VERS_NO" = 'null' THEN
          NULL
        ELSE
          nml."ARVN_VERS_NO"
    END) AS return_version_no
  FROM
    "import"."NALD_MOD_LOGS" nml
  INNER JOIN
    "import"."NALD_ABS_LICENCES" nal
    ON
      nal."ID" = nml."AABL_ID" AND nal."FGAC_REGION_CODE" = nml."FGAC_REGION_CODE"
  LEFT JOIN
    "import"."NALD_MOD_REASONS" nmr
    ON
      nmr."AMRE_TYPE" = nml."AMRE_AMRE_TYPE" AND nmr."CODE" = nml."AMRE_CODE"
  LEFT JOIN (
    SELECT
      nrc."RV_LOW_VALUE",
      nrc."RV_MEANING"
    FROM
      "import"."NALD_REF_CODES" nrc
    WHERE
      nrc."RV_DOMAIN" = 'EVENT'
  ) events
    ON
      events."RV_LOW_VALUE" = nml."EVENT"
  WHERE
    -- ignore impoundment licences
    nml."AIMP_ID" = 'null'
    AND nml."AIMV_AIMP_ID" = 'null'
),
formatted_mod_logs AS (
  SELECT
    (concat_ws(':', nml.region_code, nml.mod_log_id)) AS external_id,
    nml.event_code,
    nml.event_description,
    nml.reason_type,
    nml.reason_code,
    nml.reason_description,
    nml.nald_date,
    nml.user_id,
    nml.note,
    nml.licence_ref,
    (concat_ws(':', nml.region_code, nml.licence_id)) AS licence_external_id,
    (CASE
      WHEN nml.licence_version_id IS NULL THEN
        NULL
      ELSE
        concat_ws(
          ':',
          nml.region_code,
          nml.licence_version_id,
          nml.licence_version_issue_no,
          nml.licence_version_increment_no
        )
    END) AS licence_version_external_id,
    (CASE
      WHEN nml.charge_version_id IS NULL THEN
        NULL
      ELSE
        concat_ws(
          ':',
          nml.region_code,
          nml.charge_version_id,
          nml.charge_version_no
        )
    END) AS charge_version_external_id,
    (CASE
      WHEN nml.return_version_id IS NULL THEN
        NULL
      ELSE
        concat_ws(
          ':',
          nml.region_code,
          nml.return_version_id,
          nml.return_version_no
        )
    END) AS return_version_external_id
  FROM
    nald_mod_logs nml
)
INSERT INTO water.mod_logs (
    external_id,
    event_code,
    event_description,
    reason_type,
    reason_code,
    reason_description,
    nald_date,
    user_id,
    note,
    licence_ref,
    licence_external_id,
    licence_version_external_id,
    charge_version_external_id,
    return_version_external_id
)
SELECT
  fml.external_id,
  fml.event_code,
  fml.event_description,
  fml.reason_type,
  fml.reason_code,
  fml.reason_description,
  fml.nald_date,
  fml.user_id,
  fml.note,
  fml.licence_ref,
  fml.licence_external_id,
  fml.licence_version_external_id,
  fml.charge_version_external_id,
  fml.return_version_external_id
FROM
  formatted_mod_logs fml
ON CONFLICT(external_id) DO NOTHING;
  `)
}

module.exports = {
  go
}
