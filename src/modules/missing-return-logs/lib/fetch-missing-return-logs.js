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
    rc.due_date AS return_cycle_due_date
  FROM
    return_requirement_history rrh
  INNER JOIN
    "returns".return_cycles rc
    ON
      rc.is_summer = rrh.summer
      AND rc.start_date <= rrh.calculated_return_version_end_date
      AND rc.end_date >= rrh.return_version_start_date
),
returns_history_misses AS (
  SELECT
    rh.*
  FROM
    returns_history rh
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        "returns"."returns" r
      WHERE
        r.return_cycle_id = rh.return_cycle_id
        AND r.return_requirement_id = rh.return_requirement_id
    )
)
SELECT
  rhm.licence_id,
  rhm.licence_ref,
  rhm.water_undertaker,
  rhm.area_code,
  rhm.region_id,
  rhm.licence_end_date,
  rhm.calculated_end_date,
  rhm.return_version_id,
  rhm.return_version_start_date,
  rhm.return_version_end_date,
  rhm.return_requirement_id,
  rhm.legacy_id,
  rhm.reporting_frequency,
  rhm.summer,
  rhm.abstraction_period_start_day,
  rhm.abstraction_period_start_month,
  rhm.abstraction_period_end_day,
  rhm.abstraction_period_end_month,
  rhm.site_description,
  rhm.two_part_tariff,
  rhm.return_cycle_id,
  rhm.return_cycle_start_date,
  rhm.return_cycle_end_date,
  rhm.return_cycle_due_date
FROM
  returns_history_misses rhm
ORDER BY
  rhm.licence_id,
  rhm.return_version_id,
  rhm.return_requirement_id,
  rhm.return_cycle_start_date DESC;
  `)
}

module.exports = {
  go
}
