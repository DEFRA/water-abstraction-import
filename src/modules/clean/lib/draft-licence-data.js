'use strict'

const db = require('../../../lib/connectors/db.js')

const LICENCE_VERSIONS_TO_REMOVE_QUERY = `
WITH nald_lic_vers AS (
  SELECT
    CONCAT_WS(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS nald_id,
    nalv."FGAC_REGION_CODE",
    nalv."AABL_ID",
    nalv."ISSUE_NO",
    nalv."INCR_NO"
  FROM
    "import"."NALD_ABS_LIC_VERSIONS" nalv
  WHERE
    nalv."STATUS" = 'DRAFT'
),
licence_versions_to_remove AS (
  SELECT
    lv.licence_id,
    lv.id AS licence_version_id
  FROM
    public.licence_versions lv
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        nald_lic_vers nlv
      WHERE
        nlv.nald_id = lv.external_id
      )
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.licence_version_purposes lvp
      INNER JOIN public.licence_version_purpose_conditions lvpc
        ON lvpc.licence_version_purpose_id = lvp.id
      INNER JOIN public.licence_monitoring_stations lms
        ON lms.licence_version_purpose_condition_id = lvpc.id
      WHERE
        lvp.licence_version_id = lv.id
      )
)
`

async function go () {
  await _modLogs()
  await _licenceVersionPurposeConditions()
  await _licenceVersionPurposePoints()
  await _licenceVersionPurposes()
  await _licenceVersionWorkflows()
  await _licenceVersionHolders()
  await _licenceVersions()
}

async function _modLogs () {
  // Delete any mod logs linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.mod_logs ml
WHERE ml.licence_version_id IN (
  SELECT
    lvtr.licence_version_id
  FROM
    licence_versions_to_remove lvtr
);
  `)
}

async function _licenceVersionPurposeConditions () {
  // Delete any licence version purpose conditions linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.licence_version_purpose_conditions lvpc
WHERE lvpc.licence_version_purpose_id IN (
  SELECT
    lvp.id
  FROM
    public.licence_version_purposes lvp
  INNER JOIN licence_versions_to_remove lvtr
    ON lvtr.licence_version_id = lvp.licence_version_id
);
  `)
}

async function _licenceVersionPurposePoints () {
  // Delete any licence version purpose points linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.licence_version_purpose_points lvpp
WHERE lvpp.licence_version_purpose_id IN (
  SELECT
    lvp.id
  FROM
    public.licence_version_purposes lvp
  INNER JOIN licence_versions_to_remove lvtr
    ON lvtr.licence_version_id = lvp.licence_version_id
);
  `)
}

async function _licenceVersionPurposes () {
  // Delete any licence version purposes linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.licence_version_purposes lvp
WHERE lvp.licence_version_id IN (
  SELECT
    lvtr.licence_version_id
  FROM
    licence_versions_to_remove lvtr
);
  `)
}

async function _licenceVersionWorkflows () {
  // Delete any workflows linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.workflows w
WHERE w.licence_version_id IN (
  SELECT
    lvtr.licence_version_id
  FROM
    licence_versions_to_remove lvtr
);
  `)
}

async function _licenceVersionHolders () {
  // Delete any licence version holders linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.licence_version_holders lvh
WHERE lvh.licence_version_id IN (
  SELECT
    lvtr.licence_version_id
  FROM
    licence_versions_to_remove lvtr
);
  `)
}

async function _licenceVersions () {
  // Delete any licence versions linked to draft NALD licence versions
  await db.query(`
${LICENCE_VERSIONS_TO_REMOVE_QUERY}
DELETE FROM public.licence_versions lv
WHERE lv.id IN (
  SELECT
    lvtr.licence_version_id
  FROM
    licence_versions_to_remove lvtr
);
  `)
}

module.exports = {
  go
}
