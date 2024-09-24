'use strict'

const { pool } = require('../../../lib/connectors/db.js')
const LicencesJob = require('./licences.js')

const JOB_NAME = 'points.points'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    // Import points
    await pool.query(_query())
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(LicencesJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

function _query () {
  return `
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
  `
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
