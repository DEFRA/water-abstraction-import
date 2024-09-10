'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

async function go () {
  try {
    global.GlobalNotifier.omg('clean.return-versions started')

    const startTime = currentTimeInNanoseconds()

    // Delete any return requirement points linked to deleted NALD return requirements
    await _cleanPoints()

    // Delete any return requirement purposes linked to deleted NALD return requirements
    await _cleanPurposes()

    // Delete any return requirements linked to deleted NALD return requirements
    await _cleanRequirements()

    // Delete any return versions that have no return requirements and that are linked to deleted return versions
    await _cleanVersions()

    // Update the mod logs to remove the return version ID for where the return version has now been deleted
    await _cleanModLogs()

    calculateAndLogTimeTaken(startTime, 'clean.return-versions complete')
  } catch (error) {
    global.GlobalNotifier.omfg('clean.return-versions errored', error)
    throw error
  }
}

async function _cleanPoints () {
  return db.query(`
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
    );
  `)
}

async function _cleanPurposes () {
  return db.query(`
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
    );
  `)
}

async function _cleanRequirements () {
  return db.query(`
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
    );
  `)
}

async function _cleanVersions () {
  return db.query(`
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

async function _cleanModLogs () {
  return db.query(`
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

module.exports = {
  go
}
