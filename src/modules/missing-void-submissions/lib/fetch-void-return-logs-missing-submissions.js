'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode) {
  const params = [regionCode]

  const query = `WITH
unsubmitted_void_returns AS (
  SELECT
    SUBSTRING(r.return_id, 4, 1) AS region_code,
    r.return_id,
    r.id AS return_log_id,
    r.return_requirement_id,
    r.licence_ref,
    rr.legacy_id::text AS format_id,
    rr.reference AS reference,
    r.returns_frequency,
    r.start_date AS return_start,
    r.end_date AS return_end,
    (CASE
      WHEN r.returns_frequency = 'week' THEN
        -- Calculate First Sunday (Start of Week 1)
        (
          (r.start_date + ((6 - EXTRACT(DOW FROM r.start_date)::integer + 7) % 7) * INTERVAL '1 day')::date
          - INTERVAL '6 days'
        )::date
      ELSE
        r.start_date
    END) AS match_start_date,
    (CASE
      WHEN r.returns_frequency = 'week' THEN
        -- Calculate Last Saturday (End of Last Week)
        (
          r.end_date - ((EXTRACT(DOW FROM r.end_date)::integer - 6 + 7) % 7) * INTERVAL '1 day'
        )::date
      ELSE
        r.end_date
    END) AS match_end_date
  FROM
    "returns"."returns" r
  INNER JOIN
    water.return_requirements rr
    ON
      rr.return_requirement_id = r.return_requirement_id
  WHERE
    r.status = 'void'
    AND r."source" = 'NALD'
    AND NOT EXISTS (
      SELECT
        1
      FROM
        "returns".versions v
      WHERE
        v.return_log_id = r.id
    )
    AND SUBSTRING(r.return_id, 4, 1) = $1 -- Region partition filter
),
date_bounds AS (
  -- OPTIMIZATION: Calculate date bounds to trim down the huge NALD source tables
  SELECT
    MIN(uvr.match_start_date) AS min_date,
    MAX(uvr.match_end_date) AS max_date
  FROM unsubmitted_void_returns uvr
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
    SELECT DISTINCT region_code, format_id FROM unsubmitted_void_returns
  ) uvr ON uvr.region_code = nrl."FGAC_REGION_CODE" AND uvr.format_id = nrl."ARFL_ARTY_ID"
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
    SELECT DISTINCT region_code, format_id FROM unsubmitted_void_returns
  ) uvr ON uvr.region_code = nrl."FGAC_REGION_CODE" AND uvr.format_id = nrl."ARFL_ARTY_ID"
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
void_quantities AS (
  SELECT
    uvr.region_code,
    uvr.return_id,
    uvr.return_log_id,
    uvr.return_requirement_id,
    uvr.licence_ref,
    uvr.format_id,
    uvr.reference,
    uvr.returns_frequency,
    uvr.return_start,
    uvr.return_end,
    uvr.match_start_date,
    uvr.match_end_date,
    SUM(anl.quantity) AS nald_quantity
  FROM
    unsubmitted_void_returns uvr
  INNER JOIN
    all_nald_lines anl
    ON anl.region_code = uvr.region_code
    AND anl.format_id = uvr.format_id
    AND anl.return_date BETWEEN uvr.match_start_date AND uvr.match_end_date
  GROUP BY
    uvr.region_code,
    uvr.return_id,
    uvr.return_log_id,
    uvr.return_requirement_id,
    uvr.licence_ref,
    uvr.format_id,
    uvr.reference,
    uvr.returns_frequency,
    uvr.return_start,
    uvr.return_end,
    uvr.match_start_date,
    uvr.match_end_date
)
SELECT
  vq.region_code AS "regionCode",
  vq.return_id AS "returnId",
  vq.return_log_id AS "returnLogId",
  vq.return_requirement_id AS "returnRequirementId",
  vq.licence_ref AS "licenceRef",
  vq.format_id AS "formatId",
  vq.reference,
  vq.returns_frequency AS "returnsFrequency",
  vq.return_start AS "returnStartDate",
  vq.return_end AS "returnEndDate",
  vq.match_start_date AS "matchStartDate",
  vq.match_end_date AS "matchEndDate",
  vq.nald_quantity AS "naldQuantity"
FROM
  void_quantities vq
ORDER BY
  vq.licence_ref ASC;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
