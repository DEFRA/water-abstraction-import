'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  const query = `WITH all_licences AS (
  SELECT
    l.licence_id,
    l.licence_ref,
    r.nald_region_id,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date) AS licence_end_date
  FROM
    water.licences l
  INNER JOIN
    water.regions r
    ON r.region_id = l.region_id
),
ended_licences_with_return_versions AS (
  SELECT
    al.*
  FROM
    all_licences al
  WHERE
    al.licence_end_date IS NOT NULL
    AND EXISTS (
      SELECT
        1
      FROM
        water.return_versions rv
      WHERE
        rv.licence_id = al.licence_id
    )
),
need_voiding_return_logs AS (
  SELECT
    r.id AS return_log_id,
    r.return_id,
    r.start_date AS return_log_start_date,
    r.end_date AS return_log_end_date,
    r.status AS return_log_status,
    r.created_at AS return_log_created_at,
    elwrv.licence_id
  FROM
    "returns"."returns" r
  INNER JOIN
    ended_licences_with_return_versions elwrv
    ON
      elwrv.licence_ref = r.licence_ref
  WHERE
    r.status <> 'void'
    AND r.end_date > elwrv.licence_end_date

),
combined_results AS (
  SELECT
    elwrv.*,
    nvrl.return_log_start_date,
    nvrl.return_log_end_date,
    nvrl.return_log_status,
    nvrl.return_log_id,
    nvrl.return_id,
    nvrl.return_log_created_at
  FROM
    ended_licences_with_return_versions elwrv
  INNER JOIN
    need_voiding_return_logs nvrl
    ON nvrl.licence_id = elwrv.licence_id
)
UPDATE "returns"."returns" r
SET
  status = 'void',
  updated_at = NOW()
FROM
  combined_results cr
WHERE
  r.id = cr.return_log_id;`

  await db.query(query)
}

module.exports = {
  go
}
