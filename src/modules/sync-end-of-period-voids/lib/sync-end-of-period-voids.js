'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const query = `WITH
submitted_weekly_void_returns AS (
  SELECT
    SUBSTRING(r.return_id, 4, 1) AS region_code,
    r.return_id,
    r.id AS return_log_id,
    r.return_requirement_id,
    r.licence_ref,
    rr.legacy_id::text AS format_id,
    rr.reference AS reference,
    r.returns_frequency,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date
  FROM
    "returns"."returns" r
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_requirement_id = r.return_requirement_id
  WHERE
    r.status = 'void'
    AND r.returns_frequency = 'week'
    AND r."source" = 'NALD'
    AND EXISTS (
      SELECT
        1
      FROM
        "returns".versions v
      WHERE
        v.return_log_id = r.id
        AND v.nil_return = false
    )
    AND SUBSTRING(r.return_id, 4, 1) = $1 -- Region partition filter
),
latest_weekly_void_returns AS (
  SELECT DISTINCT ON (swvr.return_requirement_id)
    swvr.region_code,
    swvr.return_id,
    swvr.return_log_id,
    swvr.return_requirement_id,
    swvr.licence_ref,
    swvr.format_id,
    swvr.reference,
    swvr.returns_frequency,
    swvr.return_start_date,
    swvr.return_end_date
  FROM
    submitted_weekly_void_returns swvr
  ORDER BY
    swvr.return_requirement_id,
    swvr.return_end_date DESC
),
latest_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    lwvr.region_code,
    lwvr.return_log_id,
    lwvr.return_requirement_id,
    lwvr.licence_ref,
    lwvr.format_id,
    lwvr.reference,
    lwvr.returns_frequency,
    lwvr.return_start_date,
    lwvr.return_end_date,
    v.version_id
  FROM
    "returns".versions v
  INNER JOIN
    latest_weekly_void_returns lwvr
    ON lwvr.return_log_id = v.return_log_id
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
latest_submission_lines AS (
  SELECT DISTINCT ON (l.version_id)
    ls.*,
    l.line_id AS last_line_id,
    l.start_date AS line_start_date,
    l.end_date AS line_end_date,
    l.quantity
  FROM
    "returns".lines l
  INNER JOIN
    latest_submissions ls
    ON ls.version_id = l.version_id
  ORDER BY
    l.version_id,
    l.end_date DESC
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(lsl.line_start_date) AS min_date,
    MAX(lsl.return_end_date) AS max_date
  FROM
    latest_submission_lines lsl
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
    SELECT DISTINCT region_code, format_id FROM latest_weekly_void_returns
  ) lwvr ON lwvr.region_code = nrl."FGAC_REGION_CODE" AND lwvr.format_id = nrl."ARFL_ARTY_ID"
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
    SELECT DISTINCT region_code, format_id FROM latest_weekly_void_returns
  ) lwvr ON lwvr.region_code = nrl."FGAC_REGION_CODE" AND lwvr.format_id = nrl."ARFL_ARTY_ID"
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
-- In WRLS, a weekly return's lines will just be for a week, a monthly for a month. In
-- NALD a weekly or a monthly can be represented as daily lines. So, to get the NALD
-- quantity we have to sum the NALD lines that fall between the WRLS line's start and
-- end date.
-- So, we get one result per WRLS line, but the NALD quantity is the sum of the
-- matching lines. Without the grouping we'd get one result per WRLS and NALD
-- combination.
line_quantities AS (
  SELECT
    anl.region_code,
    lsl.licence_ref,
    lsl.return_log_id,
    anl.format_id,
    lsl.reference,
    lsl.returns_frequency,
    lsl.return_start_date,
    lsl.return_end_date,
    lsl.last_line_id,
    lsl.line_start_date,
    lsl.line_end_date,
    lsl.quantity,
    SUM(anl.quantity) AS nald_quantity
  FROM
    latest_submission_lines lsl
  INNER JOIN
    all_nald_lines anl
    ON anl.region_code = lsl.region_code
    AND anl.format_id = lsl.format_id
    AND anl.return_date BETWEEN lsl.line_start_date AND lsl.return_end_date
  GROUP BY
    anl.region_code,
    lsl.licence_ref,
    lsl.return_log_id,
    anl.format_id,
    lsl.reference,
    lsl.returns_frequency,
    lsl.return_start_date,
    lsl.return_end_date,
    lsl.last_line_id,
    lsl.line_start_date,
    lsl.line_end_date,
    lsl.quantity
),
mismatched_lines AS (
  SELECT
    lq.region_code,
    lq.licence_ref,
    lq.return_log_id,
    lq.format_id,
    lq.reference,
    lq.returns_frequency,
    lq.return_start_date,
    lq.return_end_date,
    lq.last_line_id,
    lq.line_start_date,
    lq.line_end_date,
    lq.quantity,
    lq.nald_quantity
  FROM
    line_quantities lq
  WHERE
    -- If either value is NULL, using <> will return 'UNKNOWN', which means the row will be ignored. IS DISTINCT FROM
    -- ensures that NULLs are treated as a value, so if one is NULL and the other isn't, the row will be returned.
    lq.quantity IS DISTINCT FROM lq.nald_quantity
)
UPDATE "returns".lines l
SET
  quantity = ml.nald_quantity,
  updated_at = NOW()
FROM
  mismatched_lines ml
WHERE
  ml.last_line_id = l.line_id;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
