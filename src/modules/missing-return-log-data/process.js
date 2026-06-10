'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await _missingReturnRequirementId()
    await _missingReturnCycleId()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'missing-return-log-data: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('missing-return-log-data: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _missingReturnCycleId () {
  const query = `WITH missing_cycle_returns AS (
  SELECT
    r.id,
    rc.return_cycle_id
  FROM
    "returns"."returns" r
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_requirement_id = r.return_requirement_id
  INNER JOIN
    "returns".return_cycles rc
    ON
      rc.is_summer = rr.is_summer
      AND rc.start_date <= r.end_date
      AND rc.end_date >= r.start_date
  WHERE
    r.return_cycle_id IS NULL
)
UPDATE "returns"."returns" r
SET
  return_cycle_id = mcr.return_cycle_id,
  updated_at = NOW()
FROM
  missing_cycle_returns mcr
WHERE
  r.id = mcr.id;
  `

  return db.query(query)
}

async function _missingReturnRequirementId () {
  const query = `WITH missing_requirement_returns AS (
  SELECT
    r.id,
    rr.return_requirement_id
  FROM
    "returns"."returns" r
  INNER JOIN
    water.licences l
    ON
      l.licence_ref = r.licence_ref
  INNER JOIN
    water.return_versions rv
    ON
      rv.licence_id = l.licence_id
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_version_id = rv.return_version_id
      AND rr.legacy_id::text = r.return_requirement
  WHERE
    r.return_requirement_id IS NULL
)
UPDATE "returns"."returns" r
SET
  return_requirement_id = mrr.return_requirement_id,
  updated_at = NOW()
FROM
  missing_requirement_returns mrr
WHERE
  r.id = mrr.id;
  `

  return db.query(query)
}

module.exports = {
  go
}
