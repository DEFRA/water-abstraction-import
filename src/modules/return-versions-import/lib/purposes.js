'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    insert into water.return_requirement_purposes (
      return_requirement_id,
      purpose_primary_id,
      purpose_secondary_id,
      purpose_use_id,
      external_id,
      purpose_alias,
      date_created,
      date_updated
    )
    select
      r.return_requirement_id,
      p.purpose_primary_id,
      s.purpose_secondary_id,
      u.purpose_use_id,
      concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID", nrp."APUR_APPR_CODE", nrp."APUR_APSE_CODE", nrp."APUR_APUS_CODE") as external_id,
      nullif(nrp."PURP_ALIAS", 'null') as purpose_alias,
      now() as date_created,
      now() as date_updated
    from
      "import"."NALD_RET_FMT_PURPOSES" nrp
    join water.purposes_primary p
      on nrp."APUR_APPR_CODE"=p.legacy_id
    join water.purposes_secondary s
      on nrp."APUR_APSE_CODE"=s.legacy_id
    join water.purposes_uses u
      on nrp."APUR_APUS_CODE"=u.legacy_id
    join water.return_requirements r
      on r.external_id = concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID")
    on conflict(external_id) do update
    set
      purpose_alias=excluded.purpose_alias,
      date_updated=excluded.date_updated;
  `)
}

module.exports = {
  go
}
