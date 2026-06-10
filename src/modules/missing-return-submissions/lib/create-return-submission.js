'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (returnLog, timestamp) {
  const id = generateUUID()
  const { id: returnLogId, returnId } = returnLog

  const params = [
    id,
    returnId,
    {},
    timestamp,
    timestamp,
    returnLogId
  ]

  const query = `INSERT INTO "returns".versions (
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
  'Created after spotting returns with no received date were not imported during move to WRLS from NALD. See WATER-5568 for more details.',
  $6
);`

  await db.query(query, params)

  return id
}

module.exports = {
  go
}
