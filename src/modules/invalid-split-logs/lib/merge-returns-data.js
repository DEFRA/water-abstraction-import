'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (mergedSplitLogData, timestamp) {
  const { toKeep, toDrop } = mergedSplitLogData

  await _updateReturnLog(toKeep, timestamp)
  await _deleteReturnLogs(toDrop)
}

async function _deleteReturnLogs (toDrop) {
  const ids = toDrop.map((splitLog) => {
    return splitLog.id
  })

  const params = [ids]
  const query = `DELETE FROM "returns"."returns" r WHERE r.id = ANY($1);`

  return db.query(query, params)
}

async function _updateReturnLog (toKeepSplitLog, timestamp) {
  const { dueDate, endDate, id, receivedDate, returnId, sentDate, startDate } = toKeepSplitLog

  const params = [dueDate, endDate, receivedDate, returnId, sentDate, startDate, timestamp, id]

  const query = `UPDATE "returns"."returns" r
SET
  due_date = $1,
  end_date = $2,
  received_date = $3,
  return_id = $4,
  sent_date = $5,
  start_date = $6,
  updated_at = $7
WHERE
  r.id = $8;
  `
  return db.query(query, params)
}

module.exports = {
  go
}
