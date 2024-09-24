'use strict'

const { pool } = require('../../../lib/connectors/db.js')

const JOB_NAME = 'points.returns'

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

    // Import licence version purpose points
    await pool.query(_query())
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  if (!job.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

function _query () {
  return `
    INSERT INTO water.return_requirement_points (
      return_requirement_id,
      external_id,
      point_id
    )
    SELECT
      rr.return_requirement_id,
      concat_ws(':', nrfp."FGAC_REGION_CODE", nrfp."ARTY_ID", nrfp."AAIP_ID") AS external_id,
      p.id AS point_id
    FROM
      "import"."NALD_RET_FMT_POINTS" nrfp
    INNER JOIN
      water.return_requirements rr
      ON nrfp."FGAC_REGION_CODE"=split_part(rr.external_id, ':',1)
      AND nrfp."ARTY_ID"=split_part(rr.external_id, ':',2)
    INNER JOIN
      water.points p
      ON nrfp."FGAC_REGION_CODE"=split_part(p.external_id, ':',1)
      AND nrfp."AAIP_ID"=split_part(p.external_id, ':',2)
    ON CONFLICT(external_id) DO UPDATE SET
      point_id = excluded.point_id;
  `
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
