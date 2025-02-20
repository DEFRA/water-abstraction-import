'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    await _licenceVersionPurposePoints()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-points-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-points-import: errored', error)
  }
}

async function _licenceVersionPurposePoints () {
  await db.query(`
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
  `)
}

module.exports = {
  go
}
