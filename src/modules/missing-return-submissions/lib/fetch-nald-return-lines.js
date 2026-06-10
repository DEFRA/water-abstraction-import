'use strict'

const db = require('../../../lib/connectors/db.js')
const { compareDates } = require('../../../lib/date-helpers.js')

async function go (regionId, returnReference) {
  const params = [regionId, returnReference]

  const query = `WITH old_return_lines AS (
  SELECT
    to_date(nrl."RET_DATE", 'DD/MM/YYYY') AS return_date,
    nrl."RET_QTY" AS return_qty
  FROM
    public."NALD_RET_LINES" nrl
  WHERE
    nrl."FGAC_REGION_CODE" = $1
    AND nrl."ARFL_ARTY_ID" = $2
    AND nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
),
extract_return_lines AS (
  SELECT
    to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') AS return_date,
    nrl."RET_QTY" AS return_qty
  FROM
    "import"."NALD_RET_LINES" nrl
  WHERE
    nrl."FGAC_REGION_CODE" = $1
    AND nrl."ARFL_ARTY_ID" = $2
    AND nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
),
all_lines AS (
  SELECT
    orl.*
  FROM
    old_return_lines orl
  UNION ALL
  SELECT
    erl.*
  FROM
    extract_return_lines erl
)
SELECT
  al.return_date,
  al.return_qty
FROM
  all_lines al
ORDER BY
  al.return_date ASC;`

  const rows = await db.query(query, params)

  return rows.map((row) => {
    return {
      matched: false,
      qty: Number(row.return_qty),
      returnDate: new Date(row.return_date)
    }
  })
}

module.exports = {
  go
}
