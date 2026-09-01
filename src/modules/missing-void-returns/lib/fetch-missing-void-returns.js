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
    r.nald_region_id = $1
),
wrls_licences AS (
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
wrls_return_requirements AS (
  SELECT
    wl.region_code,
    rv.licence_id,
    wl.licence_ref,
    wl.licence_end_date,
    rv.return_version_id,
    rv.end_date AS return_version_end_date,
    rr.return_requirement_id,
    rr.external_id AS external_id,
    rr.legacy_id::text AS format_id,
    rr.reporting_frequency,
    rr.is_summer,
    LEAST(wl.licence_end_date, rv.end_date) AS earliest_end_date
  FROM
    water.return_requirements rr
  INNER JOIN
    water.return_versions rv
    ON rv.return_version_id = rr.return_version_id
  INNER JOIN
    wrls_licences wl
    ON wl.licence_id = rv.licence_id
  WHERE
    rv.end_date IS NOT NULL
    AND (
      rv.reason IS NULL
      OR rv.reason NOT IN (
        'abstraction-below-100-cubic-metres-per-day',
        'licence-conditions-do-not-require-returns',
        'returns-exception',
        'temporary-trade'
      )
    )
),
last_returns AS (
  SELECT DISTINCT ON (r.return_requirement_id)
    r.id
  FROM
    "returns"."returns" r
  INNER JOIN
    wrls_return_requirements wrr
    ON wrr.return_requirement_id = r.return_requirement_id
  WHERE
    r.status <> 'due'
  ORDER BY
    r.return_requirement_id,
    r.end_date DESC,
    r.start_date DESC
),
last_return_details AS (
  SELECT
    wrr.region_code,
    wrr.licence_id,
    wrr.licence_ref,
    wrr.licence_end_date,
    wrr.return_version_end_date,
    wrr.return_requirement_id,
    wrr.external_id,
    wrr.format_id,
    wrr.reporting_frequency,
    wrr.is_summer,
    wrr.earliest_end_date,
    r.id AS return_log_id,
    r.start_date AS return_start_date,
    r.end_date AS return_end_date,
    r.status AS return_status,
    r.metadata
  FROM
    last_returns lr
  INNER JOIN
    "returns"."returns" r
    ON r.id = lr.id
  INNER JOIN
    wrls_return_requirements wrr
    ON wrr.return_requirement_id = r.return_requirement_id
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
      SELECT DISTINCT region_code, format_id, earliest_end_date
      FROM
        wrls_return_requirements
    ) wr
    ON wr.region_code = nrl."FGAC_REGION_CODE"
    AND wr.format_id = nrl."ARFL_ARTY_ID"
    AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') > wr.earliest_end_date
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') > wr.earliest_end_date
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
      SELECT DISTINCT region_code, format_id, earliest_end_date
      FROM
        wrls_return_requirements
    ) wr
    ON wr.region_code = nrl."FGAC_REGION_CODE"
    AND wr.format_id = nrl."ARFL_ARTY_ID"
    AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') > wr.earliest_end_date
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    -- OPTIMIZATION: Filter dates immediately during table read
    AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') > wr.earliest_end_date
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
missing_void_returns AS (
  SELECT DISTINCT
    lrd.region_code,
    lrd.licence_id,
    lrd.licence_ref,
    lrd.return_requirement_id,
    lrd.external_id,
    lrd.reporting_frequency,
    lrd.is_summer,
    lrd.format_id,
    lrd.return_status,
    lrd.metadata,
    lrd.return_version_end_date,
    lrd.earliest_end_date,
    lrd.return_start_date,
    lrd.return_end_date,
    rc.return_cycle_id,
    rc.start_date AS return_cycle_start_date,
    rc.end_date AS return_cycle_end_date,
    rc.due_date AS return_cycle_due_date
  FROM
    all_nald_lines anl
  INNER JOIN
    last_return_details lrd
    ON anl.region_code = lrd.region_code
    AND anl.format_id = lrd.format_id
  INNER JOIN
    "returns".return_cycles rc
    ON rc.is_summer = lrd.is_summer
    AND anl.return_date BETWEEN rc.start_date AND rc.end_date
  WHERE
    anl.return_date > lrd.return_end_date
)
SELECT
  *
FROM
  missing_void_returns mvr
ORDER BY
  mvr.licence_ref ASC,
  mvr.return_end_date DESC;
`

  return db.query(query, params)
}

module.exports = {
  go
}
