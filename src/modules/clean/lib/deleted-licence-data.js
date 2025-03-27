'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _licenceMonitoringStations()
  await _licenceVersionPurposeConditions()
  await _licenceVersionPurposePoints()
  await _licenceVersionPurposes()
  await _licenceVersionWorkflows()
  await _licenceVersions()
}

async function _licenceMonitoringStations () {
  // Delete any soft deleted licence monitoring stations linked to deleted NALD licence version purpose conditions
  await db.query(`
    WITH licences_safe_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      INNER JOIN "import"."NALD_ABS_LICENCES" nal
      ON l.licence_ref = nal."LIC_NO"
    ),
    nald_licence_version_purpose_conditions AS (
      SELECT CONCAT_WS(':', nlc."ID", nlc."FGAC_REGION_CODE", nlc."AABP_ID") AS nald_id
      FROM "import"."NALD_LIC_CONDITIONS" nlc
    )
    DELETE FROM public.licence_monitoring_stations lms
    WHERE lms.licence_version_purpose_condition_id IN (
      SELECT lvpc.id FROM public.licence_version_purpose_conditions lvpc
      WHERE NOT EXISTS (SELECT 1 FROM nald_licence_version_purpose_conditions nlvpc WHERE nlvpc.nald_id = lvpc.external_id)
    )
    AND lms.licence_id IN (SELECT lstr.licence_id FROM licences_safe_to_remove lstr)
    AND lms.deleted_at IS NOT NULL;
  `)
}

async function _licenceVersionPurposeConditions () {
  // Delete any licence version purpose conditions linked to deleted NALD licence version purpose conditions
  await db.query(`
    WITH purposes_safe_to_remove AS (
      SELECT lvp.id AS licence_version_purpose_id
      FROM public.licence_version_purposes lvp
      INNER JOIN public.licence_versions lv
        ON lvp.licence_version_id = lv.id
      INNER JOIN public.licences l
        ON lv.licence_id = l.id
      INNER JOIN "import"."NALD_ABS_LICENCES" nal
        ON l.licence_ref = nal."LIC_NO"
    ),
    nald_licence_version_purpose_conditions AS (
      SELECT CONCAT_WS(':', nlc."ID", nlc."FGAC_REGION_CODE", nlc."AABP_ID") AS nald_id
      FROM "import"."NALD_LIC_CONDITIONS" nlc
    )
    DELETE FROM public.licence_version_purpose_conditions lvpc
    WHERE NOT EXISTS (SELECT 1 FROM nald_licence_version_purpose_conditions nlvpc WHERE nlvpc.nald_id = lvpc.external_id)
    AND NOT EXISTS (SELECT 1 FROM public.licence_monitoring_stations lms WHERE lms.licence_version_purpose_condition_id = lvpc.id)
    AND lvpc.licence_version_purpose_id IN (SELECT pstr.licence_version_purpose_id FROM purposes_safe_to_remove pstr);
  `)
}

async function _licenceVersionPurposePoints () {
  // Delete any licence version purpose points linked to deleted NALD licence version purpose points
  await db.query(`
    WITH purposes_not_to_remove AS (
      SELECT lvpc.licence_version_purpose_id
      FROM public.licence_version_purpose_conditions lvpc
      INNER JOIN public.licence_monitoring_stations lms
        ON lms.licence_version_purpose_condition_id = lvpc.id
    ),
    purposes_safe_to_remove AS (
      SELECT lvp.id AS licence_version_purpose_id
      FROM public.licence_version_purposes lvp
      INNER JOIN public.licence_versions lv
        ON lvp.licence_version_id = lv.id
      INNER JOIN public.licences l
        ON lv.licence_id = l.id
      INNER JOIN "import"."NALD_ABS_LICENCES" nal
        ON l.licence_ref = nal."LIC_NO"
      WHERE NOT EXISTS (SELECT 1 FROM purposes_not_to_remove pntr WHERE pntr.licence_version_purpose_id = lvp.id)
    ),
    nald_licence_version_purpose_points AS (
      SELECT CONCAT_WS(':', napp."FGAC_REGION_CODE", napp."AABP_ID", napp."AAIP_ID") AS nald_id
      FROM "import"."NALD_ABS_PURP_POINTS" napp
    )
    DELETE FROM public.licence_version_purpose_points lvpp
    WHERE NOT EXISTS (SELECT 1 FROM nald_licence_version_purpose_points nlvpp WHERE lvpp.external_id = nlvpp.nald_id)
    AND lvpp.licence_version_purpose_id IN (SELECT pstr.licence_version_purpose_id FROM purposes_safe_to_remove pstr);
  `)
}

async function _licenceVersionPurposes () {
  // Delete any licence version purposes linked to deleted NALD licence version purposes
  await db.query(`
    WITH purposes_safe_to_remove AS (
      SELECT lvp.id AS licence_version_purpose_id
      FROM public.licence_version_purposes lvp
      INNER JOIN public.licence_versions lv
        ON lvp.licence_version_id = lv.id
      INNER JOIN public.licences l
        ON lv.licence_id = l.id
      INNER JOIN "import"."NALD_ABS_LICENCES" nal
        ON l.licence_ref = nal."LIC_NO"
      WHERE NOT EXISTS (SELECT 1 FROM public.licence_version_purpose_conditions lvpc WHERE lvpc.licence_version_purpose_id = lvp.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_version_purpose_points lvpp WHERE lvpp.licence_version_purpose_id = lvp.id)
    ),
    nald_licence_version_purposes AS (
      SELECT CONCAT(nalp."FGAC_REGION_CODE", ':', nalp."ID") AS nald_id
      FROM "import"."NALD_ABS_LIC_PURPOSES" nalp
    )
    DELETE FROM public.licence_version_purposes lvp
    WHERE NOT EXISTS (SELECT 1 FROM nald_licence_version_purposes nlvp WHERE lvp.external_id = nlvp.nald_id)
    AND lvp.id IN (SELECT pstr.licence_version_purpose_id FROM purposes_safe_to_remove pstr);
  `)
}

async function _licenceVersionWorkflows () {
  // Delete any workflows linked to deleted NALD licence versions
  await db.query(`
    WITH nald_licence_versions AS (
      SELECT CONCAT_WS(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS nald_id
      FROM "import"."NALD_ABS_LIC_VERSIONS" nalv
    )
    DELETE FROM public.workflows w
    WHERE w.licence_version_id IN (
      SELECT lv.id FROM public.licence_versions lv
      WHERE NOT EXISTS (SELECT 1 FROM nald_licence_versions nlv WHERE lv.external_id = nlv.nald_id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_version_purposes lvp WHERE lvp.licence_version_id = lv.id)
    );
  `)
}

async function _licenceVersions () {
  // Delete any licence versions linked to deleted NALD licence versions
  await db.query(`
    WITH nald_licence_versions AS (
      SELECT CONCAT_WS(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS nald_id
      FROM "import"."NALD_ABS_LIC_VERSIONS" nalv
    )
    DELETE FROM public.licence_versions lv
      WHERE NOT EXISTS (SELECT 1 FROM nald_licence_versions nlv WHERE lv.external_id = nlv.nald_id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_version_purposes lvp WHERE lvp.licence_version_id = lv.id);
  `)
}

module.exports = {
  go
}
