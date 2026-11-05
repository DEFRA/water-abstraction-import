'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]
  const sql = `WITH regions AS (
  SELECT
    r.region_id,
    r.nald_region_id::text AS region_code
  FROM
    water.regions r
  WHERE
    r.nald_region_id = $1
),
return_licences AS (
  SELECT
    r.region_id,
    r.region_code,
    l.licence_id,
    l.licence_ref,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date) AS licence_end_date
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
all_return_requirements AS (
  SELECT
    rl.region_code,
    rv.licence_id,
    rl.licence_ref,
    rl.licence_end_date,
    rv.return_version_id,
    rv.end_date AS return_version_end_date,
    rr.return_requirement_id,
    rr.external_id AS external_id,
    rr.legacy_id::text AS format_id,
    rr.reference,
    rr.reporting_frequency,
    rr.is_summer,
    LEAST(rl.licence_end_date, rv.end_date) AS earliest_end_date
  FROM
    water.return_requirements rr
  INNER JOIN
    water.return_versions rv
    ON rv.return_version_id = rr.return_version_id
  INNER JOIN
    return_licences rl
    ON rl.licence_id = rv.licence_id
  WHERE
    rr.reporting_frequency IN ('fortnight', 'week')
    AND
    (
      rv.reason IS NULL
      OR rv.reason NOT IN (
        'abstraction-below-100-cubic-metres-per-day',
        'licence-conditions-do-not-require-returns',
        'returns-exception',
        'temporary-trade'
      )
    )
),
ended_return_requirements AS (
  SELECT
    arr.*
  FROM
    all_return_requirements arr
  WHERE
    arr.earliest_end_date IS NOT NULL
),
first_completed_void_returns AS (
  SELECT DISTINCT ON (r.return_requirement_id)
    r.return_requirement_id,
    r.id AS return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    r.status AS return_status
  FROM
    "returns"."returns" r
  INNER JOIN
    ended_return_requirements err
    ON err.return_requirement_id = r.return_requirement_id
  WHERE
    r.status = 'void'
    AND EXISTS (
      SELECT
        1
      FROM
        "returns".versions v
      WHERE
        v.return_log_id = r.id
        AND v.nil_return = FALSE
    )
  ORDER BY
    r.return_requirement_id,
    r.start_date ASC,
    r.end_date ASC
),
last_completed_returns AS (
  SELECT DISTINCT ON (r.return_requirement_id)
    r.return_requirement_id,
    r.id AS return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    r.status AS return_status
  FROM
    "returns"."returns" r
  INNER JOIN
    ended_return_requirements err
    ON err.return_requirement_id = r.return_requirement_id
  WHERE
    r.status = 'completed'
  ORDER BY
    r.return_requirement_id,
    r.end_date DESC,
    r.start_date DESC
),
requirements_with_both AS (
  SELECT DISTINCT
    err.return_requirement_id,
    err.region_code,
    err.format_id,
    err.reference,
    err.reporting_frequency
  FROM
    ended_return_requirements err
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        first_completed_void_returns fvr
      WHERE
        fvr.return_requirement_id = err.return_requirement_id
    )
    AND EXISTS (
      SELECT
        1
      FROM
        last_completed_returns lcr
      WHERE
        lcr.return_requirement_id = err.return_requirement_id
    )
),
latest_submissions AS (
  SELECT DISTINCT ON (v.return_log_id)
    v.return_log_id,
    lcr.return_start_date,
    lcr.return_end_date,
    v.version_id,
    rwb.return_requirement_id,
    rwb.region_code,
    rwb.format_id,
    rwb.reference,
    rwb.reporting_frequency
  FROM
    "returns".versions v
  INNER JOIN
    last_completed_returns lcr
    ON lcr.return_log_id = v.return_log_id
  INNER JOIN
    requirements_with_both rwb
    ON rwb.return_requirement_id = lcr.return_requirement_id
  WHERE
    v.user_type = 'system'
  ORDER BY
    v.return_log_id,
    v.version_number DESC
),
terminal_return_boundaries AS (
  SELECT
    ls.return_log_id,
    ls.version_id,
    ls.return_requirement_id,
    ls.region_code,
    ls.format_id,
    ls.return_start_date,
    ls.return_end_date,
    MAX(l.start_date) AS last_line_start_date
  FROM
    latest_submissions ls
  INNER JOIN
    "returns".lines l
    ON l.version_id = ls.version_id
  GROUP BY
    ls.return_log_id,
    ls.version_id,
    ls.return_requirement_id,
    ls.region_code,
    ls.format_id,
    ls.return_start_date,
    ls.return_end_date
),
partial_lines AS (
  SELECT
    trb.*,
    l.line_id AS last_line_id,
    trb.last_line_start_date AS start_date,
    l.end_date AS end_date,
    l.quantity
  FROM
    terminal_return_boundaries trb
  INNER JOIN
    "returns".lines l
    ON
      l.version_id = trb.version_id
      AND l.start_date = trb.last_line_start_date
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(trb.return_start_date) AS min_date,
    MAX(trb.return_end_date) AS max_date
  FROM terminal_return_boundaries trb
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
    SELECT DISTINCT region_code, format_id FROM requirements_with_both
  ) rwb ON rwb.region_code = nrl."FGAC_REGION_CODE" AND rwb.format_id = nrl."ARFL_ARTY_ID"
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
    SELECT DISTINCT region_code, format_id FROM requirements_with_both
  ) rwb ON rwb.region_code = nrl."FGAC_REGION_CODE" AND rwb.format_id = nrl."ARFL_ARTY_ID"
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
    pl.last_line_id,
    pl.start_date,
    pl.end_date,
    pl.quantity,
    SUM(anl.quantity) AS nald_quantity
  FROM
    partial_lines pl
  INNER JOIN
    all_nald_lines anl
    ON anl.region_code = pl.region_code
    AND anl.format_id = pl.format_id
    AND anl.return_date BETWEEN pl.start_date AND pl.end_date
  GROUP BY
    anl.region_code,
    anl.format_id,
    pl.last_line_id,
    pl.start_date,
    pl.end_date,
    pl.quantity
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
  ml.last_line_id = l.line_id;`

  await db.query(sql, params)
}

module.exports = {
  go
}
