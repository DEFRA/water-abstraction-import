'use strict'

const db = require('../../../lib/connectors/db.js')

/**
 * Process irregular split returns
 *
 * In testing we encountered licences that have a specific issue that would overly complicate the fix we've built for
 * invalid split logs in `merge-returns-data.js`.
 *
 * In both cases there was an invalid split log, plus a 'void' return log.
 *
 * |Start date|End date  |Status   |
 * |----------|----------|---------|
 * |2024-04-04|2025-02-13|completed|
 * |2024-02-14|2025-03-31|completed|
 * |2024-04-04|2025-03-31|void     |
 *
 * The completed ones had submissions imported from NALD. The 'void' return was a user submission.
 *
 * The user submission was only voided because of the legacy logic that generated the invalid split logs. It should be
 * the return we retain, rather than the imported ones, which are just a result of the original Nil return anyway!
 *
 * > Nil return -> FME conversion -> NALD lines with qty -> WRLS Import -> Split logs + qty imported against them
 *
 * `process-invalid-split-log.js` detects whether an invalid split return is irregular or not, as in it has a 'void'
 * return that covers the period the merged return would, and it has a submission.
 *
 * If it is, this module handles it. Else `merge-returns-data.js` does.
 *
 * @param {Object} mergedSplitLogData - Data for the merged split log, containing `toKeep` and `toDrop` properties.
 * @param {Date} timestamp - Shared timestamp to assign to all the database changes in this fix
 */
async function go (mergedSplitLogData, timestamp) {
  const { toKeep, toDrop } = mergedSplitLogData

  const toDeleteIds = _toDeleteIds(toKeep, toDrop)

  await db.transaction(async (query) => {
    await _deleteSubmissionLines(query, toDeleteIds)
    await _deleteSubmissions(query, toDeleteIds)
    await _deleteReturnLogs(query, toDeleteIds)
    await _updateVoidNilReturn(query, toKeep, timestamp)
  })
}

async function _deleteReturnLogs (query, toDeleteIds) {
  const params = [toDeleteIds]
  const sql = 'DELETE FROM "returns"."returns" r WHERE r.id = ANY($1);'

  return query(sql, params)
}

async function _deleteSubmissions (query, toDeleteIds) {
  const params = [toDeleteIds]
  const sql = 'DELETE FROM "returns".versions v WHERE v.return_log_id = ANY($1);'

  return query(sql, params)
}

async function _deleteSubmissionLines (query, toDeleteIds) {
  const params = [toDeleteIds]
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

function _toDeleteIds (toKeep, toDrop) {
  const ids = toDrop.map((splitLog) => {
    return splitLog.id
  })

  ids.push(toKeep.id)

  return ids
}

async function _updateVoidNilReturn (query, toKeep, timestamp) {
  const { isCurrent, returnId } = toKeep

  const params = [timestamp, returnId]
  const sql = `UPDATE "returns"."returns" r
SET
  metadata = jsonb_set(r.metadata, '{isCurrent}', to_jsonb(${isCurrent})),
  status = 'completed',
  updated_at = $1
WHERE
  r.return_id = $2;`

  return query(sql, params)
}

module.exports = {
  go
}
