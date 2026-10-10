'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (region) {
  const params = [region]
  const sql = `WITH
due_weekly_returns AS (
  -- 1. Identify 'due' weekly returns and compute their exact Sunday-to-Saturday date boundaries
  SELECT
    r.id AS return_log_id,
    r.return_id,
    r.licence_ref,
    r.return_requirement AS format_id,
    r.returns_frequency,
    r.start_date AS return_start,
    r.end_date AS return_end,
    SUBSTRING(r.return_id, 4, 1) AS region_code,
    -- Calculate First Sunday (Start of Week 1)
    (
      (r.start_date + ((6 - EXTRACT(DOW FROM r.start_date)::integer + 7) % 7) * INTERVAL '1 day')::date
      - INTERVAL '6 days'
    )::date AS weekly_window_start,
    -- Calculate Last Saturday (End of Last Week)
    (
      r.end_date - ((EXTRACT(DOW FROM r.end_date)::integer - 6 + 7) % 7) * INTERVAL '1 day'
    )::date AS weekly_window_end

  FROM "returns"."returns" r
  WHERE r.returns_frequency = 'week'
    AND r.status = 'due'
    AND SUBSTRING(r.return_id, 4, 1) = $1 -- Region partition filter
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(dwr.weekly_window_start) AS min_date,
    MAX(dwr.weekly_window_end) AS max_date
  FROM
    due_weekly_returns dwr
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
    SELECT DISTINCT region_code, format_id FROM due_weekly_returns
  ) dwr
    ON dwr.region_code = nrl."FGAC_REGION_CODE"
    AND dwr.format_id = nrl."ARFL_ARTY_ID"
  CROSS JOIN
    date_bounds db
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
    SELECT DISTINCT region_code, format_id FROM due_weekly_returns
  ) dwr
    ON dwr.region_code = nrl."FGAC_REGION_CODE"
    AND dwr.format_id = nrl."ARFL_ARTY_ID"
  CROSS JOIN
    date_bounds db
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
matched_nald_returns AS (
  -- 2. Join due returns against NALD lines on region, requirement ID, and window dates
  SELECT
    dwr.return_log_id,
    dwr.return_id,
    dwr.licence_ref,
    dwr.format_id,
    dwr.returns_frequency,
    dwr.return_start,
    dwr.return_end,
    dwr.weekly_window_start,
    dwr.weekly_window_end,
    COUNT(anl.*) AS nald_line_count,
    MIN(anl.return_date) AS earliest_nald_line_date,
    MAX(anl.return_date) AS latest_nald_line_date
  FROM
    due_weekly_returns dwr
  INNER JOIN all_nald_lines anl
    ON anl.region_code = dwr.region_code
    AND anl.format_id = dwr.format_id
    -- NALD line date falls within the return's weekly window
    AND anl.return_date >= dwr.weekly_window_start
    AND anl.return_date <= dwr.weekly_window_end
  GROUP BY
    dwr.return_log_id,
    dwr.return_id,
    dwr.licence_ref,
    dwr.format_id,
    dwr.returns_frequency,
    dwr.return_start,
    dwr.return_end,
    dwr.weekly_window_start,
    dwr.weekly_window_end
)
-- 3. Output due returns that have at least one matching NALD line
SELECT
  mnr.return_log_id AS "returnLogId",
  mnr.return_id AS "returnId",
  mnr.licence_ref AS "licenceRef",
  mnr.return_start AS "returnStartDate",
  mnr.return_end AS "returnEndDate",
  mnr.weekly_window_start AS "weeklyWindowStartDate",
  mnr.weekly_window_end AS "weeklyWindowEndDate",
  mnr.nald_line_count AS "naldLineCount"
FROM
  matched_nald_returns mnr
ORDER BY
  mnr.return_start ASC;`

  const results = await db.query(sql, params)

  return results.map((result) => {
    return {
      ...result,
      returnStartDate: new Date(result.returnStartDate),
      returnEndDate: new Date(result.returnEndDate)
    }
  })
}

module.exports = {
  go
}
