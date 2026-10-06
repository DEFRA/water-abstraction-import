'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (mergedSplitLogData, timestamp) {
  const { toKeep, toDrop } = mergedSplitLogData

  const toDropIds = _toDropIds(toDrop)

  await db.transaction(async (query) => {
    if (toKeep.submissionCount > 0) {
      await _updateSubmissionLines(query, toKeep, toDropIds, timestamp)
      await _deleteSubmissionLines(query, toDropIds)
      await _deleteSubmissions(query, toDropIds)
    }

    await _updateReturnLogAndSubmissions(query, toKeep, timestamp)
    await _deleteReturnLogs(query, toDropIds)
  })
}

async function _deleteReturnLogs (query, toDropIds) {
  const params = [toDropIds]
  const sql = `DELETE FROM "returns"."returns" r WHERE r.id = ANY($1);`

  return query(sql, params)
}

function _toDropIds (toDrop) {
  return toDrop.map((splitLog) => {
    return splitLog.id
  })
}

async function _updateReturnLogAndSubmissions (query, toKeepSplitLog, timestamp) {
  const { dueDate, endDate, id, isCurrent, receivedDate, returnId, sentDate, startDate } = toKeepSplitLog

  const params = [dueDate, endDate, receivedDate, returnId, sentDate, startDate, isCurrent, timestamp, id, returnId, timestamp]

  // The return log (returns.returns) and its submissions (returns.versions) both need to move to the new return_id at
  // the same time. versions.return_id has a foreign key to returns.return_id, so updating either table on its own
  // breaks the constraint: update versions first and the new return_id does not exist yet; update returns first and the
  // existing versions rows are left pointing at the old return_id. Doing both in a single writable CTE statement means
  // the foreign key is only checked once, at the end of the statement, by which point both tables agree.
  const sql = `WITH updated_return_log AS (
  UPDATE "returns"."returns" r
  SET
    due_date = $1,
    end_date = $2,
    received_date = $3,
    return_id = $4,
    sent_date = $5,
    start_date = $6,
    metadata = jsonb_set(r.metadata, '{isCurrent}', to_jsonb($7::boolean)),
    updated_at = $8
  WHERE
    r.id = $9
  RETURNING r.id
)
UPDATE "returns".versions v
SET
  return_id = $10,
  updated_at = $11
FROM
  updated_return_log url
WHERE
  v.return_log_id = url.id;
  `

  return query(sql, params)
}

async function _updateSubmissionLines (query, toKeepSplitLog, toDropIds, timestamp) {
  const { id: toKeepId } = toKeepSplitLog

  const params = [toKeepId, toDropIds, timestamp]
  const sql = `WITH
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

  return query(sql, params)
}

async function _deleteSubmissionLines (query, toDropIds) {
  const params = [toDropIds]
  const sql = `DELETE FROM "returns".lines l WHERE l.version_id IN (
SELECT
  v.version_id
FROM
  "returns".versions v
WHERE
  v.return_log_id = ANY($1)
);
  `

  return query(sql, params)
}

async function _deleteSubmissions (query, toDropIds) {
  const params = [toDropIds]
  const sql = 'DELETE FROM "returns".versions v WHERE v.return_log_id = ANY($1);'

  return query(sql, params)
}

module.exports = {
  go
}
