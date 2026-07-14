'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await _clean()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clean-return-logs: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clean-return-logs: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _clean () {
  await db.query(`WITH no_return_requirement_logs AS (
  SELECT
    r.*
  FROM
    "returns"."returns" r
  WHERE
    r.return_requirement_id IS NULL
),
can_be_fixed_return_logs AS (
  SELECT
    nrrl.id
  FROM
    no_return_requirement_logs nrrl
  INNER JOIN
    water.licences l
    ON
      l.licence_ref = nrrl.licence_ref
  INNER JOIN
    water.return_versions rv
    ON
      rv.licence_id = l.licence_id
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_version_id = rv.return_version_id
      AND rr.legacy_id::text = nrrl.return_requirement
),
deleted_licence_return_logs AS (
  SELECT
    nrrl.id
  FROM
    no_return_requirement_logs nrrl
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        water.licences l
      WHERE
        nrrl.licence_ref = l.licence_ref
    )
),
combined_results AS (
  SELECT
    nrrl.id,
    nrrl.return_id,
    nrrl.licence_ref,
    nrrl.start_date,
    nrrl.end_date,
    nrrl.received_date,
    nrrl.status,
    nrrl."source",
    nrrl.created_at,
    nrrl.return_requirement,
    (CASE
      WHEN cbfrl.id IS NOT NULL THEN
        'can be fixed'
      WHEN dlrl.id IS NOT NULL THEN
        'licence deleted'
      ELSE
        'rtn req deleted'
    END) AS reason_missing,
    v.version_id,
    v.user_id AS submitted_by,
    v.nil_return
  FROM
    no_return_requirement_logs nrrl
  LEFT JOIN
    deleted_licence_return_logs dlrl
    ON
      dlrl.id = nrrl.id
  LEFT JOIN
    can_be_fixed_return_logs cbfrl
    ON
      cbfrl.id = nrrl.id
  LEFT JOIN
    "returns".versions v
    ON
      v.return_log_id = nrrl.id
),
no_submissions AS (
  SELECT
    cr.*
  FROM
    combined_results cr
  WHERE
    cr.version_id IS NULL
)
DELETE FROM "returns"."returns" r
WHERE r.id IN (SELECT ns.id FROM no_submissions ns);
  `)
}

module.exports = {
  go
}
