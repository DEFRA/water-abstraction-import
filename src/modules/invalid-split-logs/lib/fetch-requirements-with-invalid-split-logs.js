'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]

  const query = `WITH regions AS (
  SELECT
    r.region_id,
    r.nald_region_id AS region_code
  FROM
    water.regions r
  WHERE
    r.nald_region_id = $1
),
licences AS (
  SELECT
    r.region_id,
    r.region_code,
    l.licence_id,
    l.licence_ref,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date) AS licence_end_date
  FROM
    water.licences l
  INNER JOIN
    regions r
    ON r.region_id = l.region_id
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        water.return_versions rv
      WHERE
        rv.licence_id = l.licence_id
    )
),
return_requirements AS (
  SELECT
    l.region_code,
    rv.licence_id,
    l.licence_ref,
    l.licence_end_date,
    rv.return_version_id,
    rr.return_requirement_id,
    rv.start_date AS return_version_start_date,
    rv.end_date AS return_version_end_date,
    LEAST(l.licence_end_date, rv.end_date, CURRENT_DATE) AS earliest_end_date
  FROM
    water.return_requirements rr
  INNER JOIN
    water.return_versions rv
    ON rv.return_version_id = rr.return_version_id
  INNER JOIN
    licences l
    ON l.licence_id = rv.licence_id
  WHERE
  rv.quarterly_returns = FALSE
  AND (
    rv.reason IS NULL
    OR rv.reason NOT IN (
      'abstraction-below-100-cubic-metres-per-day',
      'licence-conditions-do-not-require-returns',
      'returns-exception',
      'temporary-trade'
    )
  )
),
-- We use LEFT JOIN to versions as it is more performant than an inline EXISTS.
-- But it does mean iof a return log has multiple submissions, it will appear in
-- the results multiple times. Hence the need for a DISTINCT
return_logs AS (
  SELECT DISTINCT
    rr.return_requirement_id,
    r.id AS return_log_id,
    r.start_date AS return_log_start_date,
    r.end_date AS return_log_end_date,
    r.status,
    r.return_cycle_id,
    rc.start_date AS return_cycle_start_date,
    rc.end_date AS return_cycle_end_date
  FROM
    "returns"."returns" r
  INNER JOIN
    "returns".return_cycles rc
    ON rc.return_cycle_id = r.return_cycle_id
  INNER JOIN
    return_requirements rr
    ON rr.return_requirement_id = r.return_requirement_id
  WHERE
    r.status <> 'void'
    AND r.quarterly = FALSE
),
requirement_return_logs AS (
  SELECT
    rr.return_requirement_id,
    rl.return_cycle_id,
    rl.return_cycle_start_date,
    rl.return_cycle_end_date,
    COUNT(rl.return_log_id) AS total_logs
  FROM
    return_logs rl
  INNER JOIN
    return_requirements rr
    ON rr.return_requirement_id = rl.return_requirement_id
  GROUP BY
    rr.return_requirement_id,
    rl.return_cycle_id,
    rl.return_cycle_start_date,
    rl.return_cycle_end_date
),
split_return_requirements AS (
  SELECT
    rrl.return_requirement_id,
    rrl.return_cycle_id
  FROM
    requirement_return_logs rrl
  WHERE
    rrl.total_logs > 1
)
SELECT
  srl.return_requirement_id AS "returnRequirementId",
  srl.return_cycle_id AS "returnCycleId"
FROM
  split_return_requirements srl
WHERE
  srl.return_requirement_id = '8f9a2f1d-09c7-4e6f-b342-c2126097d3cf'
  AND srl.return_cycle_id = 'caa8d42a-2781-4696-94b6-77cdc350dca0'
ORDER BY
  srl.return_requirement_id ASC,
  srl.return_cycle_id ASC;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
