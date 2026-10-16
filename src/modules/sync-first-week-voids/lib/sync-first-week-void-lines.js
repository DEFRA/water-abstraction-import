'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const sql = `WITH
weekly_void_return_logs AS (
  SELECT
    SUBSTRING(r.return_id, 4, 1) AS region_code,
    r.licence_ref,
    r.id AS return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    r.status AS return_status,
    r.return_requirement AS format_id
  FROM
    "returns"."returns" r
  WHERE
    r."source" = 'NALD'
    AND r.status = 'void'
    AND r.returns_frequency = 'week'
    AND EXISTS (
      SELECT
        1
      FROM
        "returns".versions v
      WHERE
        v.return_log_id = r.id
        AND v.user_type = 'system'
        AND v.nil_return = FALSE
    )
    AND SUBSTRING(r.return_id, 4, 1) = $1
),
latest_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    wvrl.region_code,
    wvrl.licence_ref,
    wvrl.return_log_id,
    wvrl.format_id,
    wvrl.return_start_date,
    wvrl.return_end_date,
    wvrl.return_status,
    v.version_id
  FROM
    "returns".versions v
  INNER JOIN
    weekly_void_return_logs wvrl
    ON wvrl.return_log_id = v.return_log_id
  WHERE
    v.user_type = 'system'
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
first_weekly_lines AS (
  SELECT DISTINCT ON (l.version_id)
    ls.region_code,
    ls.licence_ref,
    ls.return_log_id,
    ls.format_id,
    ls.return_start_date,
    ls.return_end_date,
    ls.return_status,
    ls.version_id,
    l.line_id,
    l.start_date AS line_start_date,
    l.end_date AS line_end_date,
    l.quantity AS line_quantity
  FROM
    "returns".lines l
  INNER JOIN
    latest_submissions ls
    ON ls.version_id = l.version_id
  ORDER BY
    l.version_id,
    l.start_date ASC
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(fwl.return_start_date) AS min_date,
    MAX(fwl.line_end_date) AS max_date
  FROM first_weekly_lines fwl
),
old_return_lines AS (
  SELECT
    1 AS line_source,
    nrl."FGAC_REGION_CODE" AS region_code,
    nrl."ARFL_ARTY_ID" AS format_id,
    to_date(nrl."ARFL_DATE_FROM", 'DD/MM/YYYY') AS from_date,
    to_date(nrl."RET_DATE", 'DD/MM/YYYY') AS return_date,
    nrl."RET_QTY"::decimal AS quantity
  FROM
    public."NALD_RET_LINES" nrl
  INNER JOIN (
    SELECT DISTINCT region_code, format_id FROM weekly_void_return_logs
  ) wr ON wr.region_code = nrl."FGAC_REGION_CODE" AND wr.format_id = nrl."ARFL_ARTY_ID"
  CROSS JOIN date_bounds db
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    -- OPTIMIZATION: Filter dates immediately during table read
    AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') BETWEEN db.min_date AND db.max_date
),
extract_return_lines AS (
  SELECT
    2 AS line_source,
    nrl."FGAC_REGION_CODE" AS region_code,
    nrl."ARFL_ARTY_ID" AS format_id,
    to_date(nrl."ARFL_DATE_FROM", 'YYYYMMDDHH24MISS') AS from_date,
    to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') AS return_date,
    nrl."RET_QTY"::decimal AS quantity
  FROM
    "import"."NALD_RET_LINES" nrl
  INNER JOIN (
    SELECT DISTINCT region_code, format_id FROM weekly_void_return_logs
  ) wr ON wr.region_code = nrl."FGAC_REGION_CODE" AND wr.format_id = nrl."ARFL_ARTY_ID"
  CROSS JOIN date_bounds db
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    -- OPTIMIZATION: Filter dates immediately during table read
    AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') BETWEEN db.min_date AND db.max_date
),
-- This is where we deal with any duplicates in the two data sources. The four fields
-- we're distinct on give us unique records per dataset. If we do have a dupe across
-- them, the final order by line_source means we only return one of the records (the
-- one from the old lines data set)
--
-- A note about from_date. We found instances of duplicate NALD lines with the same
-- region, format ID and return date. The difference between the two lines was the
-- ARFL_DATE_FROM date. Any NALD reporting of the values will have included both, so
-- by including from_date in our DISTINCT ON, we ensure we also include both when
-- we come to sum the NALD lines.
all_nald_lines AS (
  SELECT DISTINCT ON (rl.region_code, rl.format_id, rl.return_date, rl.from_date)
    rl.region_code,
    rl.format_id,
    rl.return_date,
    rl.quantity
  FROM (
    SELECT
      orl.*
    FROM
      old_return_lines orl
    UNION ALL
    SELECT
      erl.*
    FROM
      extract_return_lines erl
  ) rl
  ORDER BY
    rl.region_code,
    rl.format_id,
    rl.return_date,
    rl.from_date,
    rl.line_source
),
line_nald_quantities AS (
  SELECT
    fwl.line_id,
    SUM(anl.quantity) AS nald_quantity
  FROM
    first_weekly_lines fwl
  LEFT JOIN
    all_nald_lines anl
    ON anl.region_code = fwl.region_code
    AND anl.format_id = fwl.format_id
    AND anl.return_date BETWEEN fwl.return_start_date AND fwl.line_end_date
  GROUP BY
    fwl.line_id
),
mismatched_lines AS (
  SELECT
    fwl.*,
    lnq.nald_quantity
  FROM
    first_weekly_lines fwl
  INNER JOIN
    line_nald_quantities lnq
    ON lnq.line_id = fwl.line_id
  WHERE
    -- If either value is NULL, using <> will return 'UNKNOWN', which means the row will be ignored. IS DISTINCT FROM
    -- ensures that NULLs are treated as a value, so if one is NULL and the other isn't, the row will be returned.
    fwl.line_quantity IS DISTINCT FROM lnq.nald_quantity
)
UPDATE "returns".lines l
SET
  quantity = ml.nald_quantity,
  updated_at = NOW()
FROM
  mismatched_lines ml
WHERE
  ml.line_id = l.line_id;`

  await db.query(sql, params)
}

module.exports = {
  go
}
