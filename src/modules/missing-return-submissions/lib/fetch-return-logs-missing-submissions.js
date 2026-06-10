'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  return db.query(`WITH due_return_logs AS (
  SELECT
    rl.id,
    rl.return_id,
    rl.return_reference,
    rr.external_id,
    rl.start_date,
    rl.end_date,
    rl.returns_frequency,
    (LEFT(rr.external_id, 1)) AS region_id,
    rl.return_requirement_id
  FROM
    public.return_logs rl
  INNER JOIN
    public.return_requirements rr
    ON rr.id = rl.return_requirement_id
  WHERE
    rl.status = 'due'
    AND rr.external_id IS NOT NULL
),
due_return_references AS (
  SELECT DISTINCT
    drl.return_reference,
    drl.external_id
  FROM
    due_return_logs drl
),
old_return_lines AS (
  SELECT
    nrl."ARFL_ARTY_ID" AS return_reference,
    concat_ws(':', nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID") AS external_id,
    to_date(nrl."RET_DATE", 'DD/MM/YYYY') AS return_date
  FROM
    public."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    AND EXISTS (
      SELECT
        1
      FROM
        due_return_references drr
      WHERE
        drr.external_id = concat_ws(':', nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID")
    )
),
extract_return_lines AS (
  SELECT
    nrl."ARFL_ARTY_ID" AS return_reference,
    concat_ws(':', nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID") AS external_id,
    to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') AS return_date
  FROM
    "import"."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    AND EXISTS (
      SELECT
        1
      FROM
        due_return_references drr
      WHERE
        drr.external_id = concat_ws(':', nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID")
    )

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
),
wrong_status_return_logs AS (
  SELECT
    drl.*
  FROM
    due_return_logs drl
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        all_lines al
      WHERE
        al.external_id = drl.external_id
        AND al.return_date BETWEEN drl.start_date AND drl.end_date
    )
)
SELECT
  wsrl.return_requirement_id,
  wsrl.id,
  wsrl.return_id,
  wsrl.start_date,
  wsrl.end_date,
  wsrl.region_id,
  wsrl.return_reference,
  wsrl.returns_frequency
FROM
  wrong_status_return_logs wsrl
ORDER BY
  wsrl.return_requirement_id,
  wsrl.start_date ASC;
  `)
}

module.exports = {
  go
}
