'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const query = `-- Grab all the lines created by the import, past or present for a specific region.
-- Means the overal step time will be longer, but reduces the risk of a time out
-- as the query does take some time to run.
WITH imported_return_lines AS (
  SELECT
    r.id AS return_log_id,
    r.licence_ref,
    (SPLIT_PART(rr.external_id, ':', 1)) AS region_code,
    rr.legacy_id::text AS format_id,
    rr.reporting_frequency,
    l.line_id,
    l.start_date,
    l.end_date,
    l.quantity
  FROM
    "returns".lines l
  INNER JOIN
    "returns".versions v
    ON
      v.version_id = l.version_id
  INNER JOIN
    "returns"."returns" r
    ON
      r.id = v.return_log_id
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_requirement_id = r.return_requirement_id
  WHERE
    v.user_type = 'system'
    AND v.nil_return = FALSE
    AND SPLIT_PART(rr.external_id, ':', 1) = $1
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(irl.start_date) AS min_date,
    MAX(irl.end_date) AS max_date
  FROM imported_return_lines irl
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
    SELECT DISTINCT region_code, format_id FROM imported_return_lines
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
    SELECT DISTINCT region_code, format_id FROM imported_return_lines
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
    anl.format_id,
    irl.line_id,
    irl.start_date,
    irl.end_date,
    irl.quantity,
    SUM(anl.quantity) AS nald_quantity
  FROM
    imported_return_lines irl
  INNER JOIN
    all_nald_lines anl
    ON anl.region_code = irl.region_code
    AND anl.format_id = irl.format_id
    AND anl.return_date BETWEEN irl.start_date AND irl.end_date
  GROUP BY
    anl.region_code,
    anl.format_id,
    irl.line_id,
    irl.start_date,
    irl.end_date,
    irl.quantity
),
mismatched_lines AS (
  SELECT
    lq.line_id,
    lq.nald_quantity
  FROM
    line_quantities lq
  WHERE
    lq.quantity <> lq.nald_quantity
)
UPDATE "returns".lines l
SET
  quantity = ml.nald_quantity,
  updated_at = NOW()
FROM
  mismatched_lines ml
WHERE
  ml.line_id = l.line_id;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
