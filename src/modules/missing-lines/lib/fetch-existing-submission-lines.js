'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (versionId) {
  const params = [versionId]
  const sql = `SELECT
  l.line_id AS "lineId",
  l.quantity,
  l.start_date AS "startDate",
  l.end_date AS "endDate",
  l.time_period AS "timePeriod",
  l.reading_type AS "readingType",
  l.user_unit AS "userUnit"
FROM
  "returns".lines l
WHERE
  l.version_id = $1;
  `

  const results = await db.query(sql, params)

  return results.map((result) => {
    return {
      ...result,
      endDate: new Date(result.endDate),
      startDate: new Date(result.startDate)
    }
  })
}

module.exports = {
  go
}
