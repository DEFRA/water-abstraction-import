'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (returnRequirementId, returnCycleId) {
  const params = [returnRequirementId, returnCycleId]
  const query = `WITH
invalid_split_logs AS (
  SELECT
    r.licence_ref,
    r.id,
    r.return_id,
    r.start_date,
    r.end_date,
    r.due_date,
    r.received_date,
    r.sent_date,
    r.return_requirement,
    r.status,
    (
      SELECT
        COUNT(*)
      FROM
        "returns".versions v
      WHERE
        v.return_log_id = r.id
    ) AS submission_count,
    (r.metadata->>'isCurrent')::bool AS is_current
  FROM
    "returns"."returns" r
  WHERE
    r.return_requirement_id = $1
    AND r.return_cycle_id = $2
    AND r.status <> 'void'
),
latest_return_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.return_log_id,
    v.nil_return,
    v.user_type
  FROM
    "returns".versions v
  INNER JOIN
    invalid_split_logs isl
    ON isl.id = v.return_log_id
  ORDER BY
    v.return_log_id,
    v.version_number DESC
)
SELECT
  isl.licence_ref AS "licenceRef",
  isl.id,
  isl.return_id AS "returnId",
  isl.start_date AS "startDate",
  isl.end_date AS "endDate",
  isl.due_date AS "dueDate",
  isl.received_date AS "receivedDate",
  isl.sent_date AS "sentDate",
  isl.return_requirement AS "returnReference",
  isl.status,
  isl.submission_count AS "submissionCount",
  isl.is_current AS "isCurrent",
  lrs.nil_return AS "nilReturn",
  (CASE
    WHEN lrs.user_type IS NULL THEN
      FALSE
    WHEN lrs.user_type = 'system' THEN
      FALSE
    ELSE
      TRUE
  END) AS "userSubmission"
FROM
  invalid_split_logs isl
LEFT JOIN
  latest_return_submissions lrs
  ON lrs.return_log_id = isl.id;`

  return db.query(query, params)
}

module.exports = {
  go
}
