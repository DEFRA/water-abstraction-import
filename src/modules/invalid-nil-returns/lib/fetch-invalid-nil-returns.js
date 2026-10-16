'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const sql = `WITH
latest_nil_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.return_log_id,
    v.version_id
  FROM
    "returns".versions v
  INNER JOIN
    "returns"."returns" r
    ON r.id = v.return_log_id
  WHERE
    v.user_type = 'system'
    AND v.nil_return = TRUE
    AND r."source" = 'NALD'
    AND SUBSTRING(r.return_id, 4, 1) = $1 -- Region partition filter
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
nil_return_logs AS (
  SELECT
    SUBSTRING(r.return_id, 4, 1) AS region_code,
    r.licence_ref,
    r.id AS return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    r.status AS return_status,
    r.returns_frequency,
    r.return_requirement AS format_id,
    (CASE
      WHEN r.returns_frequency = 'week' THEN
        -- Calculate First Sunday (Start of Week 1)
        ((r.start_date + ((6 - EXTRACT(DOW FROM r.start_date)::integer + 7) % 7) * INTERVAL '1 day')::date - INTERVAL '6 days')::date
      ELSE
        r.start_date
    END) AS window_start,
    (CASE
      WHEN r.returns_frequency = 'week' THEN
        -- Calculate Last Saturday (End of Last Week)
        (r.end_date - ((EXTRACT(DOW FROM r.end_date)::integer - 6 + 7) % 7) * INTERVAL '1 day')::date
      ELSE
        r.end_date
    END) AS window_end,
    lns.version_id
  FROM
    "returns"."returns" r
  INNER JOIN
    latest_nil_submissions lns
    ON lns.return_log_id = r.id
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(nrl.window_start) AS min_date,
    MAX(nrl.window_end) AS max_date
  FROM nil_return_logs nrl
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
    SELECT DISTINCT region_code, format_id FROM nil_return_logs
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
    SELECT DISTINCT region_code, format_id FROM nil_return_logs
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
    nrl.return_log_id,
    SUM(anl.quantity) AS nald_quantity
  FROM
    nil_return_logs nrl
  LEFT JOIN
    all_nald_lines anl
    ON anl.region_code = nrl.region_code
    AND anl.format_id = nrl.format_id
    AND anl.return_date BETWEEN nrl.window_start AND nrl.window_end
  GROUP BY
    nrl.return_log_id
),
invalid_nil_returns AS (
  SELECT
    nrl.*,
    lnq.nald_quantity
  FROM
    nil_return_logs nrl
  INNER JOIN
    line_nald_quantities lnq
    ON lnq.return_log_id = nrl.return_log_id
  WHERE
    lnq.nald_quantity IS NOT NULL
    OR lnq.nald_quantity <> 0
)
SELECT
  inr.return_log_id AS "returnLogId",
  inr.return_start_date AS "returnStartDate",
  inr.return_end_date AS "returnEndDate",
  inr.returns_frequency AS "reportingFrequency",
  inr.version_id AS "versionId"
FROM
  invalid_nil_returns inr;`

  return db.query(sql, params)
}

module.exports = {
  go
}
