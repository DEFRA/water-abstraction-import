'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _returnRequirementPoints()
  await _returnRequirementPurposes()
  await _returnRequirements()
  await _returnVersions()
  await _modLogs()
}

async function _modLogs () {
  // Update the mod logs to remove the return version ID for where the return version has now been deleted
  await db.query(`
    UPDATE
      water.mod_logs ml
    SET
      return_version_id = NULL
    WHERE
      ml.return_version_id IS NOT NULL
      AND ml.return_version_id NOT IN (
        SELECT
          rv.return_version_id
        FROM
          water.return_versions rv
      );
  `)
}

async function _returnRequirementPoints () {
  // Delete any return requirement points linked to deleted NALD return requirements
  await db.query(`
    WITH nald_return_requirements AS (
      SELECT concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") AS nald_id
      FROM "import"."NALD_RET_FORMATS" nrf
    )
    DELETE FROM water.return_requirement_points rrp WHERE rrp.return_requirement_id IN (
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
          LIMIT 1
        )
      UNION ALL
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
            AND rl.status IN ('due', 'void')
          LIMIT 1
        )
    );
  `)
}

async function _returnRequirementPurposes () {
  // Delete any return requirement purposes linked to deleted NALD return requirements
  await db.query(`
    WITH nald_return_requirements AS (
      SELECT concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") AS nald_id
      FROM "import"."NALD_RET_FORMATS" nrf
    )
    DELETE FROM water.return_requirement_purposes rrp WHERE rrp.return_requirement_id IN (
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
          LIMIT 1
        )
      UNION ALL
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
            AND rl.status IN ('due', 'void')
          LIMIT 1
        )
    );
  `)
}

async function _returnRequirements () {
  // Delete any return requirements linked to deleted NALD return requirements
  await db.query(`
    WITH nald_return_requirements AS (
      SELECT concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") AS nald_id
      FROM "import"."NALD_RET_FORMATS" nrf
    )
    DELETE FROM water.return_requirements WHERE return_requirement_id IN (
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
          LIMIT 1
        )
      UNION ALL
      SELECT
        rr.return_requirement_id
      FROM
        water.return_requirements rr
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_requirements nrr
          WHERE rr.external_id = nrr.nald_id
        )
        AND EXISTS (
          SELECT 1
          FROM "returns"."returns" rl
          WHERE
            rl.return_requirement = rr.legacy_id::varchar
            AND rl.status IN ('due', 'void')
          LIMIT 1
        )
    );
  `)
}

async function _returnVersions () {
  await db.query(`
    WITH nald_return_versions AS (
      SELECT concat_ws(':', nv."FGAC_REGION_CODE", nv."AABL_ID", nv."VERS_NO") AS nald_id
      FROM "import"."NALD_RET_VERSIONS" nv
    )
    DELETE FROM water.return_versions WHERE return_version_id IN (
      SELECT
        rv.return_version_id
      FROM
        water.return_versions rv
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nald_return_versions nrv
          WHERE rv.external_id = nrv.nald_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM water.return_requirements rr
          WHERE
            rr.return_version_id = rv.return_version_id
          LIMIT 1
        )
    );
  `)
}

module.exports = {
  go
}
