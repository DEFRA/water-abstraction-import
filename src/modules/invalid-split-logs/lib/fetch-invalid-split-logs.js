'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (returnRequirementId, returnCycleId) {
  const params = [returnRequirementId, returnCycleId]
  const query = `SELECT
  r.licence_ref AS "licenceRef",
  r.id,
  r.return_id AS "returnId",
  r.start_date AS "startDate",
  r.end_date AS "endDate",
  r.due_date AS "dueDate",
  r.received_date AS "receivedDate",
  r.sent_date AS "sentDate",
  r.return_requirement AS "returnReference",
  r.status,
  (
    SELECT
      COUNT(*)
    FROM
      "returns".versions v
    WHERE
      v.return_log_id = r.id
  ) AS "submissionCount",
  EXISTS(
    SELECT
      1
    FROM
      "returns".versions v
    WHERE
      v.return_log_id = r.id
      AND v.user_type IN ('external', 'internal')
  ) AS "userSubmission"
FROM
  "returns"."returns" r
WHERE
  r.return_requirement_id = $1
  AND r.return_cycle_id = $2;`

  return db.query(query, params)
}

module.exports = {
  go
}
