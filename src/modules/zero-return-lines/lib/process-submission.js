'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (submission, timestamp) {
  const { lines, returnId } = submission

  const zeroQtyLines = lines.filter((line) => {
    return line.quantity === 0
  })

  for (const line of zeroQtyLines) {
    await _updateLine(line, returnId, timestamp)
  }
}

async function _processSubmission(submission, timestamp) {
  const { lines, returnId } = submission

  const zeroQtyLines = lines.filter((line) => {
    return line.quantity === 0
  })

  for (const line of zeroQtyLines) {
    await _updateLine(line, returnId, timestamp)
  }
}

async function _updateLine(line, returnId, timestamp) {
  const params = [returnId, line.quantity, timestamp, line.endDate]

  const query = `WITH first_return_submission AS (
  SELECT DISTINCT ON (v.return_id)
    v.return_id,
    v.version_id
  FROM
    "returns".versions v
  WHERE
    v.return_id = $1
  ORDER BY
    v.return_id ASC,
    v.version_number ASC
)
UPDATE "returns".lines l
SET
  quantity = $2,
  updated_at = $3
FROM first_return_submission frs
WHERE
  l.version_id = frs.version_id
  AND l.quantity IS NULL
  AND l.end_date = $4;
`

  await db.query(query, params)
}

module.exports = {
  go
}
