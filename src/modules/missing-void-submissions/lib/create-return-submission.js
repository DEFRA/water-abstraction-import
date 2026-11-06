'use strict'

async function go (query, versionId, voidReturnLog, timestamp) {
  const { returnLogId, returnId } = voidReturnLog

  const params = [
    versionId,
    returnId,
    {},
    timestamp,
    timestamp,
    returnLogId
  ]

  const sql = `INSERT INTO "returns".versions (
  version_id,
  return_id,
  user_id,
  user_type,
  version_number,
  metadata,
  created_at,
  updated_at,
  nil_return,
  "current",
  notes,
  return_log_id
)
VALUES (
  $1,
  $2,
  'imported.from@nald.gov.uk',
  'system',
  1,
  $3,
  $4,
  $5,
  FALSE,
  TRUE,
  'Created to allow import of NALD return lines that match VOID return logs. See WATER-5926.',
  $6
);`

  await query(sql, params)
}

module.exports = {
  go
}
