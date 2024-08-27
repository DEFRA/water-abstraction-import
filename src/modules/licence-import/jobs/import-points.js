'use strict'

const { pool } = require('../../../lib/connectors/db')

const JOB_NAME = 'licence-import.import-points'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME,
      expireIn: '1 hours'
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    return _importPoints()
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete () {
  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

async function _importPoints () {
  return pool.query(`
  INSERT INTO water.licence_version_purpose_points (
    licence_version_purpose_id,
    description,
    ngr_1,
    ngr_2,
    ngr_3,
    ngr_4,
    external_id,
    nald_point_id
  )
    SELECT
      lvp.licence_version_purpose_id,
      np."LOCAL_NAME" AS description,
      concat_ws(' ', np."NGR1_SHEET", np."NGR1_EAST", np."NGR1_NORTH") AS ngr_1,
      (
        CASE np."NGR2_SHEET"
          WHEN 'null' THEN NULL
          ELSE concat_ws(' ', np."NGR2_SHEET", np."NGR2_EAST", np."NGR2_NORTH")
        END
      ) AS ngr_2,
      (
        CASE np."NGR3_SHEET"
          WHEN 'null' THEN NULL
          ELSE concat_ws(' ', np."NGR3_SHEET", np."NGR3_EAST", np."NGR3_NORTH")
        END
      ) AS ngr_3,
      (
        CASE np."NGR4_SHEET"
          WHEN 'null' THEN NULL
          ELSE concat_ws(' ', np."NGR4_SHEET", np."NGR4_EAST", np."NGR4_NORTH")
        END
      ) AS ngr_4,
      (concat_ws(':', napp."FGAC_REGION_CODE", napp."AABP_ID", napp."AAIP_ID")) AS external_id,
      napp."AAIP_ID"::integer AS nald_point_id
    FROM
      "import"."NALD_ABS_PURP_POINTS" napp
    INNER JOIN water.licence_version_purposes lvp
      ON napp."FGAC_REGION_CODE" = split_part(lvp.external_id, ':', 1) AND napp."AABP_ID" = split_part(lvp.external_id, ':', 2)
    INNER JOIN import."NALD_POINTS" np
      ON np."ID" = napp."AAIP_ID" AND np."FGAC_REGION_CODE" = napp."FGAC_REGION_CODE"
  ON CONFLICT(external_id) DO
  UPDATE SET
    description=excluded.description,
    ngr_1=excluded.ngr_1,
    ngr_2=excluded.ngr_2,
    ngr_3=excluded.ngr_3,
    ngr_4=excluded.ngr_4;
  `)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
