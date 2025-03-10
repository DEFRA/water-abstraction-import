'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    INSERT INTO water.licence_version_purpose_conditions (
      licence_version_purpose_id,
      licence_version_purpose_condition_type_id,
      param_1,
      param_2,
      notes,
      external_id,
      date_created,
      date_updated
    )
    SELECT
      lvp.licence_version_purpose_id,
      lvpct.licence_version_purpose_condition_type_id,
      nullif(nlc."PARAM1", 'null') AS param_1,
      nullif(nlc."PARAM2", 'null') AS param_2,
      nullif(nlc."TEXT", 'null') AS notes,
      concat_ws(':', nlc."ID", nlc."FGAC_REGION_CODE", nlc."AABP_ID") AS external_id,
      now() AS date_created,
      now() AS date_updated
    FROM
      "import"."NALD_LIC_CONDITIONS" nlc
    INNER JOIN water.licence_version_purposes lvp
      ON concat_ws(':', nlc."FGAC_REGION_CODE", nlc."AABP_ID") = lvp.external_id
    INNER JOIN water.licence_version_purpose_condition_types lvpct
      ON lvpct.code = nlc."ACIN_CODE" AND lvpct.subcode = nlc."ACIN_SUBCODE"
    ON CONFLICT(external_id)
    DO UPDATE SET
      licence_version_purpose_condition_type_id = excluded.licence_version_purpose_condition_type_id,
      param_1 = excluded.param_1,
      param_2 = excluded.param_2,
      notes = excluded.notes,
      date_updated = excluded.date_updated;
  `)
}

module.exports = {
  go
}
