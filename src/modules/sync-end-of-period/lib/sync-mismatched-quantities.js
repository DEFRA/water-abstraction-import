'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const query = `WITH regions AS (
  SELECT
    r.region_id,
    r.nald_region_id::text AS region_code
  FROM
    water.regions r
  WHERE
    r.nald_region_id::text = $1
),
wrls_licences AS (
  SELECT
    r.region_id,
    l.licence_id AS wrls_licence_id,
    l.licence_ref AS licence_ref
  FROM
    water.licences l
  INNER JOIN
    regions r
    ON r.region_id = l.region_id
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        water.return_versions rv
      WHERE
        rv.licence_id = l.licence_id
    )
),
wrls_return_requirements AS (
  SELECT
    rv.licence_id,
    wlc.licence_ref,
    rv.end_date AS return_version_end_date,
    rr.return_requirement_id,
    rr.external_id AS wrls_external_id,
    (SPLIT_PART(rr.external_id, ':', 1)) AS region_code,
    rr.legacy_id::text AS format_id
  FROM
    water.return_requirements rr
  INNER JOIN
    water.return_versions rv
    ON rv.return_version_id = rr.return_version_id
  -- OPTIMIZATION 1B: Filter down requirements to Wales licences immediately
  INNER JOIN
    wrls_licences wlc
    ON wlc.wrls_licence_id = rv.licence_id
  WHERE
    rr.reporting_frequency = 'week'
    AND rv.end_date IS NOT NULL
),
wrls_latest_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    v.version_id,
    wrr.return_requirement_id,
    wrr.region_code,
    wrr.format_id
  FROM
    "returns".versions v
  INNER JOIN
    "returns"."returns" r
    ON r.id = v.return_log_id
  INNER JOIN
    wrls_return_requirements wrr
    ON wrr.return_requirement_id = r.return_requirement_id
  WHERE
    r."source" = 'NALD'
    AND r."status" <> 'due'
    AND r.end_date = wrr.return_version_end_date
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
wrls_terminal_return_boundaries AS (
  SELECT
    wls.return_log_id,
    wls.version_id,
    wls.return_requirement_id,
    wls.region_code,
    wls.format_id,
    wls.return_start_date,
    wls.return_end_date,
    MAX(l.start_date) AS last_line_start_date
  FROM
    wrls_latest_submissions wls
  INNER JOIN
    "returns".lines l
    ON l.version_id = wls.version_id
  GROUP BY
    wls.return_log_id,
    wls.return_start_date,
    wls.return_end_date,
    wls.version_id,
    wls.return_requirement_id,
    wls.region_code,
    wls.format_id
),
wrls_partial_lines AS (
  SELECT
    wtrb.*,
    l.line_id AS last_line_id,
    -- The extended line starts on the same day, but ends when the return ends
    wtrb.last_line_start_date AS start_date,
    wtrb.return_end_date AS end_date,
    l.quantity
  FROM
    wrls_terminal_return_boundaries wtrb
  INNER JOIN
    "returns".lines l
    ON
      l.version_id = wtrb.version_id
      AND l.start_date = wtrb.last_line_start_date
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(wtrb.return_start_date) AS min_date,
    MAX(wtrb.return_end_date) AS max_date
  FROM wrls_terminal_return_boundaries wtrb
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
    SELECT DISTINCT region_code, format_id FROM wrls_return_requirements
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
    SELECT DISTINCT region_code, format_id FROM wrls_return_requirements
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
    wpl.last_line_id,
    wpl.start_date,
    wpl.end_date,
    wpl.quantity,
    SUM(anl.quantity) AS nald_quantity
  FROM
    wrls_partial_lines wpl
  INNER JOIN
    all_nald_lines anl
    ON anl.region_code = wpl.region_code
    AND anl.format_id = wpl.format_id
    AND anl.return_date BETWEEN wpl.start_date AND wpl.end_date
  GROUP BY
    anl.region_code,
    anl.format_id,
    wpl.last_line_id,
    wpl.start_date,
    wpl.end_date,
    wpl.quantity
),
mismatched_lines AS (
  SELECT
    lq.region_code,
    lq.format_id,
    lq.last_line_id,
    lq.start_date,
    lq.end_date,
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
