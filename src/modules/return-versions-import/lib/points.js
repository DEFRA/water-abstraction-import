'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
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
  `)
}

module.exports = {
  go
}
