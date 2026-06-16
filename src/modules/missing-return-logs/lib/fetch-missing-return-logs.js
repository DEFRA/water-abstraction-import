'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  return db.query(`WITH licence_details AS (
  SELECT
    l.licence_id,
    l.licence_ref,
    l.is_water_undertaker AS water_undertaker,
    l.regions->>'historicalAreaCode' AS area_code,
    r.nald_region_id AS region_id,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date) AS licence_end_date
  FROM
    water.licences l
  INNER JOIN
    water.regions r
    ON
      r.region_id = l.region_id
),
return_version_details AS (
  SELECT
    ld.*,
    rv.return_version_id,
    rv.start_date AS return_version_start_date,
    rv.end_date AS return_version_end_date,
    LEAST(rv.end_date, ld.licence_end_date, CURRENT_DATE) AS calculated_end_date
  FROM
    water.return_versions rv
  INNER JOIN
    licence_details ld
    ON
      ld.licence_id = rv.licence_id
  WHERE
    rv.status = 'current'
    AND rv.quarterly_returns = FALSE
    AND (
      ld.licence_end_date IS NULL OR rv.start_date <= ld.licence_end_date
    )
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
return_requirement_details AS (
  SELECT
    rvd.*,
    rr.return_requirement_id,
    rr.legacy_id,
    rr.reporting_frequency,
    rr.is_summer AS summer,
    rr.abstraction_period_start_day,
    rr.abstraction_period_start_month,
    rr.abstraction_period_end_day,
    rr.abstraction_period_end_month,
    rr.site_description,
    rr.two_part_tariff
  FROM
    water.return_requirements rr
  INNER JOIN
    return_version_details rvd
    ON
      rvd.return_version_id = rr.return_version_id
),
log_aggregates AS (
    -- Step 1: Combine all log ranges for each version into a single multirange
  SELECT
    r.return_requirement_id,
    range_agg(daterange(r.start_date, r.end_date, '[]')) AS logged_ranges
  FROM
    "returns"."returns" r
  WHERE
    r.status <> 'void'
    AND EXISTS (
      SELECT
        1
      FROM
        return_requirement_details rrd
      WHERE
        rrd.return_requirement_id = r.return_requirement_id
    )
  GROUP BY
    r.return_requirement_id
),
calculated_gaps AS (
  -- Step 2: Subtract the logged multirange from the master version range
  SELECT
    rrd.return_requirement_id,
    -- The '-' operator subtracts the logs multirange from the version range
    (
      datemultirange(
        daterange(
          rrd.return_version_start_date,
          rrd.calculated_end_date, '[]'
        )
      ) - COALESCE(lg.logged_ranges, datemultirange())
    ) AS gap_multirange
  FROM
    return_requirement_details rrd
  LEFT JOIN
    log_aggregates lg
    ON
      rrd.return_requirement_id = lg.return_requirement_id
),
missing_periods AS (
  SELECT
    cg.return_requirement_id,
    lower(gap_range) AS gap_start_date,
    (upper(gap_range) - INTERVAL '1 day')::date AS gap_end_date
  FROM
    calculated_gaps cg,
    unnest(cg.gap_multirange) AS gap_range
  WHERE NOT
    isempty(gap_range)
  ORDER BY
    cg.return_requirement_id,
    gap_start_date
),
missing_return_requirement_gaps AS (
  SELECT
    rrd.*,
    mp.gap_start_date,
    mp.gap_end_date
  FROM
    return_requirement_details rrd
  INNER JOIN
    missing_periods mp
    ON
      mp.return_requirement_id = rrd.return_requirement_id
),
missing_return_requirement_cycles AS (
  SELECT
    mrrg.*,
    rc.return_cycle_id,
    rc.start_date AS return_cycle_start_date,
    rc.end_date AS return_cycle_end_date,
    rc.due_date AS return_cycle_due_date
  FROM
    missing_return_requirement_gaps mrrg
  INNER JOIN
    "returns".return_cycles rc
    ON
      rc.is_summer = mrrg.summer
      AND rc.start_date <= mrrg.gap_end_date
      AND rc.end_date >= mrrg.gap_start_date
),
missing_return_requirement_periods AS (
  SELECT
    mrrc.*,
    (GREATEST(mrrc.return_version_start_date, mrrc.return_cycle_start_date, mrrc.gap_start_date)) AS return_period_start_date,
    (LEAST(mrrc.licence_end_date, mrrc.return_version_end_date, mrrc.return_cycle_end_date, mrrc.gap_end_date)) AS return_period_end_date
  FROM
    missing_return_requirement_cycles mrrc
),
missing_return_candidates AS (
  SELECT
    mrrp.*,
    (CASE
      WHEN mrrp.return_cycle_due_date IS NULL THEN
        NULL
      ELSE
        (mrrp.return_period_end_date + INTERVAL '28 day')::date
    END) AS return_period_due_date,
    concat_ws(
      ':',
      'v1',
      mrrp.region_id,
      mrrp.licence_ref,
      mrrp.legacy_id,
      to_char(mrrp.return_period_start_date, 'YYYY-MM-DD'),
      to_char(mrrp.return_period_end_date, 'YYYY-MM-DD')
    ) AS return_id
  FROM
    missing_return_requirement_periods mrrp
),
missing_returns AS (
  SELECT
    mrc.*
  FROM
    missing_return_candidates mrc
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        "returns"."returns" r
      WHERE
        r.return_id = mrc.return_id
    )
)
SELECT
  mr.licence_id,
  mr.licence_ref,
  mr.region_id,
  mr.water_undertaker,
  mr.area_code,
  mr.licence_end_date,
  mr.return_version_id,
  mr.return_version_start_date,
  mr.return_version_end_date,
  mr.calculated_end_date,
  mr.return_requirement_id,
  mr.legacy_id,
  mr.reporting_frequency,
  mr.summer,
  mr.abstraction_period_start_day,
  mr.abstraction_period_start_month,
  mr.abstraction_period_end_day,
  mr.abstraction_period_end_month,
  mr.site_description,
  mr.two_part_tariff,
  mr.gap_start_date,
  mr.gap_end_date,
  mr.return_cycle_id,
  mr.return_cycle_start_date,
  mr.return_cycle_end_date,
  mr.return_cycle_due_date,
  mr.return_period_start_date,
  mr.return_period_end_date,
  mr.return_period_due_date,
  mr.return_id
FROM
  missing_returns mr
ORDER BY
  mr.licence_ref ASC,
  mr.return_requirement_id;
  `)
}

module.exports = {
  go
}
