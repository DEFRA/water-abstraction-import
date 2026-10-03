'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (mergedSplitLogData, timestamp) {
  const { toKeep, toDrop } = mergedSplitLogData

  const toDropIds = _toDropIds(toDrop)

  if (toKeep.submissionCount > 0) {
    await _updateSubmissionLines(toKeep, toDropIds, timestamp)
    await _deleteSubmissionLines(toDropIds)
    await _deleteSubmissions(toDropIds)
  }

  await _updateReturnLogAndSubmissions(toKeep, timestamp)
  await _deleteReturnLogs(toDropIds)
}

async function _deleteReturnLogs (toDropIds) {
  const params = [toDropIds]
  const query = `DELETE FROM "returns"."returns" r WHERE r.id = ANY($1);`

  return db.query(query, params)
}

function _toDropIds (toDrop) {
  return toDrop.map((splitLog) => {
    return splitLog.id
  })
}

async function _updateReturnLogAndSubmissions (toKeepSplitLog, timestamp) {
  const { dueDate, endDate, id, receivedDate, returnId, sentDate, startDate } = toKeepSplitLog

  const params = [dueDate, endDate, receivedDate, returnId, sentDate, startDate, timestamp, id, returnId, timestamp]

  // The return log (returns.returns) and its submissions (returns.versions) both need to move to the new return_id at
  // the same time. versions.return_id has a foreign key to returns.return_id, so updating either table on its own
  // breaks the constraint: update versions first and the new return_id does not exist yet; update returns first and the
  // existing versions rows are left pointing at the old return_id. Doing both in a single writable CTE statement means
  // the foreign key is only checked once, at the end of the statement, by which point both tables agree.
  const query = `WITH updated_return_log AS (
  UPDATE "returns"."returns" r
  SET
    due_date = $1,
    end_date = $2,
    received_date = $3,
    return_id = $4,
    sent_date = $5,
    start_date = $6,
    updated_at = $7
  WHERE
    r.id = $8
  RETURNING r.id
)
UPDATE "returns".versions v
SET
  return_id = $9,
  updated_at = $10
FROM
  updated_return_log url
WHERE
  v.return_log_id = url.id;
  `

  return db.query(query, params)
}

async function _updateSubmissionLines (toKeepSplitLog, toDropIds, timestamp) {
  const { id: toKeepId } = toKeepSplitLog

  const params = [toKeepId, toDropIds, timestamp]
  const query = `WITH
latest_keep_version AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.version_id
  FROM
    "returns".versions v
  WHERE
    v.return_log_id = $1
  ORDER BY
    v.return_log_id,
    v.version_number DESC
  LIMIT 1
),
latest_drop_versions AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.version_id
  FROM
    "returns".versions v
  WHERE
    v.return_log_id = ANY($2)
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
lines_to_update AS (
  SELECT
    l.version_id,
    l.line_id,
    l.start_date
  FROM
    "returns".lines l
  INNER JOIN
    latest_drop_versions ldv
    ON ldv.version_id = l.version_id
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        "returns".lines keep_lines
      INNER JOIN
        latest_keep_version lkv
        ON lkv.version_id = keep_lines.version_id
      WHERE
        l.start_date = keep_lines.start_date
    )
)
UPDATE "returns".lines l
SET
  version_id = (
    SELECT
      lkv.version_id
    FROM
      latest_keep_version lkv
    LIMIT 1
  ),
  updated_at = $3
FROM
  lines_to_update ltu
WHERE
  ltu.line_id = l.line_id;
  `

  return db.query(query, params)
}

async function _deleteSubmissionLines (toDropIds) {
  const params = [toDropIds]
  const query = `DELETE FROM "returns".lines l WHERE l.version_id IN (
SELECT
  v.version_id
FROM
  "returns".versions v
WHERE
  v.return_log_id = ANY($1)
);
  `

  return db.query(query, params)
}

async function _deleteSubmissions (toDropIds) {
  const params = [toDropIds]
  const query = 'DELETE FROM "returns".versions v WHERE v.return_log_id = ANY($1);'

  return db.query(query, params)
}

module.exports = {
  go
}
