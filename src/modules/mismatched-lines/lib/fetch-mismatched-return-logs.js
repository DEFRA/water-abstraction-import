'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  return db.query(`WITH mismatched_submissions AS (
  SELECT DISTINCT
    r.licence_ref,
    r.return_id,
    r.id,
    r.start_date,
    r.end_date,
    v.version_id,
    v.created_at AS submitted_date,
    v.metadata,
    (v.metadata->>'method') AS "method",
    v.user_type,
    r.returns_frequency,
    l.time_period
  FROM
    "returns"."returns" r
  INNER JOIN
    "returns".versions v
    ON v.return_log_id = r.id
  INNER JOIN
    "returns".lines l
    ON l.version_id = v.version_id
  WHERE
    l.time_period <> r.returns_frequency::text
)
SELECT * FROM mismatched_submissions ms
ORDER BY
  ms."method" ASC,
  ms.licence_ref ASC;
  `)
}

module.exports = {
  go
}
