'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  return db.query(`WITH return_version_periods AS (
  SELECT
    rv.licence_id,
    MAX(COALESCE(rv.end_date, CURRENT_DATE)) AS latest_end_date
  FROM
    water.return_versions rv
  WHERE
    rv.status = 'current'
    AND rv.quarterly_returns = false
    AND (
      rv.reason IS NULL
      OR rv.reason NOT IN (
        'abstraction-below-100-cubic-metres-per-day',
        'licence-conditions-do-not-require-returns',
        'returns-exception',
        'temporary-trade'
      )
    )
  GROUP BY
    rv.licence_id
),
licences_with_return_versions AS (
  SELECT
    l.licence_id,
    l.licence_ref,
    l.is_water_undertaker AS water_undertaker,
    l.regions->>'historicalAreaCode' AS area_code,
    r.nald_region_id AS region_id,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date) AS licence_end_date,
    LEAST(l.expired_date, l.lapsed_date, l.revoked_date, rvp.latest_end_date) AS calculated_end_date
  FROM
    water.licences l
  INNER JOIN
    water.regions r
    ON
      r.region_id = l.region_id
  INNER JOIN
    return_version_periods rvp
    ON
      rvp.licence_id= l.licence_id
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        water.return_versions rv
      WHERE
        rv.licence_id = l.licence_id
        AND rv.status = 'current'
        AND rv.quarterly_returns = false
        AND (
          rv.reason IS NULL
          OR rv.reason NOT IN (
            'abstraction-below-100-cubic-metres-per-day',
            'licence-conditions-do-not-require-returns',
            'returns-exception',
            'temporary-trade'
          )
        )
    )
),
return_version_history AS (
  SELECT
    lwrv.*,
    rv.return_version_id,
    rv.start_date AS return_version_start_date,
    rv.end_date AS return_version_end_date,
    (CASE
      WHEN rv.end_date IS NULL THEN lwrv.calculated_end_date
      ELSE rv.end_date
    END) AS calculated_return_version_end_date
  FROM
    water.return_versions rv
  INNER JOIN
    licences_with_return_versions lwrv
    ON
      lwrv.licence_id = rv.licence_id
  WHERE
    rv.status = 'current'
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
return_requirement_history AS (
  SELECT
    rvh.*,
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
    return_version_history rvh
    ON
      rvh.return_version_id = rr.return_version_id
),
returns_history AS (
  SELECT
    rrh.*,
    rc.return_cycle_id,
    rc.start_date AS return_cycle_start_date,
    rc.end_date AS return_cycle_end_date,
    rc.due_date AS return_cycle_due_date,
    GREATEST(rrh.return_version_start_date, rc.start_date) AS return_period_start_date,
    LEAST(rrh.licence_end_date, rrh.return_version_end_date, rc.end_date) AS return_period_end_date
  FROM
    return_requirement_history rrh
  INNER JOIN
    "returns".return_cycles rc
    ON
      rc.is_summer = rrh.summer
      AND rc.start_date <= rrh.calculated_return_version_end_date
      AND rc.end_date >= rrh.return_version_start_date
),
returns_candidates AS (
  SELECT
    rh.*,
    (CASE
      WHEN rh.return_cycle_due_date IS NULL THEN
        NULL
      ELSE
        rh.return_period_end_date + INTERVAL '28 day'
    END) AS return_period_due_date,
    concat_ws(
      ':',
      'v1',
      rh.region_id,
      rh.licence_ref,
      rh.legacy_id,
      to_char(rh.return_period_start_date, 'YYYY-MM-DD'),
      to_char(rh.return_period_end_date, 'YYYY-MM-DD')
    ) AS return_id
  FROM
    returns_history rh
),
returns_candidate_misses AS (
  SELECT
    rc.*
  FROM
    returns_candidates rc
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        "returns"."returns" r
      WHERE
        r.return_id = rc.return_id
    )
)
SELECT
  rcm.licence_id,
  rcm.licence_ref,
  rcm.water_undertaker,
  rcm.area_code,
  rcm.region_id,
  rcm.licence_end_date,
  rcm.calculated_end_date,
  rcm.return_version_id,
  rcm.return_version_start_date,
  rcm.return_version_end_date,
  rcm.return_requirement_id,
  rcm.legacy_id,
  rcm.reporting_frequency,
  rcm.summer,
  rcm.abstraction_period_start_day,
  rcm.abstraction_period_start_month,
  rcm.abstraction_period_end_day,
  rcm.abstraction_period_end_month,
  rcm.site_description,
  rcm.two_part_tariff,
  rcm.return_cycle_id,
  rcm.return_cycle_start_date,
  rcm.return_cycle_end_date,
  rcm.return_cycle_due_date,
  rcm.return_period_start_date,
  rcm.return_period_end_date,
  rcm.return_period_due_date,
  rcm.return_id
FROM
  returns_candidate_misses rcm
ORDER BY
  rcm.licence_id,
  rcm.return_version_id,
  rcm.return_requirement_id,
  rcm.return_cycle_start_date DESC;
  `)
}

module.exports = {
  go
}
