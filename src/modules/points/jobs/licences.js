'use strict'

const { pool } = require('../../../lib/connectors/db.js')
const ReturnsJob = require('./returns.js')

const JOB_NAME = 'points.licences'

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

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ReturnsJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

function _query () {
  return `
    INSERT INTO water.licence_version_purpose_points (
      licence_version_purpose_id,
      external_id,
      point_id,
      abstraction_method
    )
    SELECT
      lvp.licence_version_purpose_id,
      (concat_ws(':', napp."FGAC_REGION_CODE", napp."AABP_ID", napp."AAIP_ID")) AS external_id,
      p.id AS point_id,
      nmoa."DESCR" AS abstraction_method
    FROM
      "import"."NALD_ABS_PURP_POINTS" napp
    INNER JOIN water.licence_version_purposes lvp
      ON napp."FGAC_REGION_CODE" = split_part(lvp.external_id, ':', 1) AND napp."AABP_ID" = split_part(lvp.external_id, ':', 2)
    INNER JOIN water.points p
      ON napp."FGAC_REGION_CODE"=split_part(p.external_id, ':',1) AND napp."AAIP_ID"=split_part(p.external_id, ':',2)
    LEFT JOIN "import"."NALD_MEANS_OF_ABS" nmoa
      ON nmoa."CODE" = napp."AMOA_CODE"
    ON CONFLICT(external_id)
    DO UPDATE
    SET
      point_id = excluded.point_id,
      abstraction_method = excluded.abstraction_method;
  `
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
