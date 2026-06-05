'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  return db.query(`
WITH raw_ended_licences AS (
  SELECT
    nal."FGAC_REGION_CODE" AS region_id,
    nal."ID" AS licence_id,
    nal."LIC_NO" AS licence_ref,
    nal."AREP_AREA_CODE" AS area_code,
    (CASE
        WHEN nal."AREP_EIUC_CODE" LIKE '%SWC' THEN TRUE
        ELSE FALSE
      END) AS water_undertaker,
    (CASE
      WHEN nal."EXPIRY_DATE" = 'null' THEN NULL
      ELSE to_date(nal."EXPIRY_DATE", 'DD/MM/YYYY')
    END) AS expired_date,
    (CASE
      WHEN nal."LAPSED_DATE" = 'null' THEN NULL
      ELSE to_date(nal."LAPSED_DATE", 'DD/MM/YYYY')
    END) AS lapsed_date,
    (CASE
      WHEN nal."REV_DATE" = 'null' THEN NULL
      ELSE to_date(nal."REV_DATE", 'DD/MM/YYYY')
    END) AS revoked_date
  FROM
    "import"."NALD_ABS_LICENCES" nal
  WHERE
    (
      nal."EXPIRY_DATE" <> 'null'
      OR
      nal."LAPSED_DATE" <> 'null'
      OR
      nal."REV_DATE" <> 'null'
    )
    AND EXISTS (
      SELECT
        1
      FROM
        "import"."NALD_RET_VERSIONS" nrv
      WHERE
        nrv."FGAC_REGION_CODE" = nal."FGAC_REGION_CODE"
        AND nrv."AABL_ID" = nal."ID"
    )
),
-- This is an interim step, where we determine the earliest end date for each licence we
-- extracted, plus make the field names easier to use in subsequent steps
ended_licences AS (
  SELECT
    rel.region_id,
    rel.licence_id,
    rel.licence_ref,
    rel.area_code,
    rel.water_undertaker,
    least(rel.expired_date, rel.lapsed_date, rel.revoked_date) AS licence_end_date
  FROM
    raw_ended_licences rel
),
-- Extract the return versions for each licence
return_versions AS (
  SELECT
    el.region_id,
    el.licence_id,
    el.licence_ref,
    el.area_code,
    el.water_undertaker,
    el.licence_end_date,
    nrv."VERS_NO" AS return_vers_no
  FROM
    "import"."NALD_RET_VERSIONS" nrv
  INNER JOIN
    ended_licences el
    ON
      nrv."FGAC_REGION_CODE" = el.region_id
      AND nrv."AABL_ID" = el.licence_id
),
-- Using the return version information, extract the return requirements (formats in NALD)
-- for each licence
return_requirements AS (
  SELECT
    rv.region_id,
    rv.licence_id,
    rv.licence_ref,
    rv.area_code,
    rv.water_undertaker,
    rv.licence_end_date,
    nrf."ID" AS format_id,
    (concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID")) AS external_id
  FROM
    "import"."NALD_RET_FORMATS" nrf
  INNER JOIN
    return_versions rv
    ON
      rv.region_id = nrf."FGAC_REGION_CODE"
      AND rv.licence_id = nrf."ARVN_AABL_ID"
      AND rv.return_vers_no = nrf."ARVN_VERS_NO"
),
-- Because the NALD return lines are split between those in the overnight extract and those in the
-- one-off extract we have to grab return line details from both places, starting with the one-off.
--
-- We only grab those that
-- - have a value
-- - are linked to the return requirements we extract
-- - have a return date greater than their licence's end date
oneoff_return_lines AS (
  SELECT
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    nrl."RET_DATE",
    nrl."RET_QTY"
  FROM
    public."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    AND nrl."RET_QTY" <> '0'
    AND EXISTS (
      SELECT
        1
      FROM
        return_requirements rr
      WHERE
        rr.region_id = nrl."FGAC_REGION_CODE"
        AND rr.format_id = nrl."ARFL_ARTY_ID"
        AND to_date(nrl."RET_DATE", 'DD/MM/YYYY') > rr.licence_end_date
    )
),
-- Does exactly the same as old_return_lines, only for overnight extract lines
overnight_return_lines AS (
  SELECT
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    nrl."RET_DATE",
    nrl."RET_QTY"
  FROM
    "import"."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
    AND nrl."RET_QTY" <> '0'
    AND EXISTS (
      SELECT
        1
      FROM
        return_requirements rr
      WHERE
        rr.region_id = nrl."FGAC_REGION_CODE"
        AND rr.format_id = nrl."ARFL_ARTY_ID"
        AND to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') > rr.licence_end_date
    )
),
-- Combine the return line results into a single result set
all_lines AS (
  SELECT
    oorl."FGAC_REGION_CODE" AS region_id,
    oorl."ARFL_ARTY_ID" AS format_id,
    to_date(oorl."RET_DATE", 'DD/MM/YYYY') AS return_date,
    oorl."RET_QTY" AS return_qty
  FROM
    oneoff_return_lines oorl
  UNION ALL
  SELECT
    onrl."FGAC_REGION_CODE" AS region_id,
    onrl."ARFL_ARTY_ID" AS format_id,
    to_date(onrl."RET_DATE", 'YYYYMMDDHH24MISS') AS return_date,
    onrl."RET_QTY" AS return_qty
  FROM
    overnight_return_lines onrl
),
-- Combine all the return line results with the return requirements so we know which lines
-- go with which licences
lines_plus_requirements AS (
  SELECT
    al.*,
    rr.licence_id,
    rr.licence_ref,
    rr.area_code,
    rr.water_undertaker,
    rr.licence_end_date,
    rr.external_id,
    wrr.return_requirement_id,
    wrr.reporting_frequency,
    wrr.is_summer AS summer,
    wrr.abstraction_period_start_day,
    wrr.abstraction_period_start_month,
    wrr.abstraction_period_end_day,
    wrr.abstraction_period_end_month,
    wrr.return_version_id,
    wrr.site_description,
    wrr.two_part_tariff
  FROM
    all_lines al
  INNER JOIN
    return_requirements rr
    ON
      rr.region_id = al.region_id
      AND rr.format_id = al.format_id
  LEFT JOIN
    water.return_requirements wrr
    ON
      wrr.external_id = rr.external_id
),
lines_plus_return_cycle_ids AS (
  SELECT
    lpr.*,
    (
      SELECT
        rc.return_cycle_id
      FROM
        "returns".return_cycles rc
      WHERE
        rc.is_summer = lpr.summer
        AND rc.start_date <= lpr.return_date
        AND rc.end_date >= lpr.return_date
    ) AS return_cycle_id
  FROM
    lines_plus_requirements lpr
),
lines_plus_return_cycles AS (
  SELECT
    lprci.*,
    rc.start_date AS return_cycle_start_date,
    rc.end_date AS return_cycle_end_date,
    rc.due_date AS return_cycle_due_date
  FROM
    lines_plus_return_cycle_ids lprci
  LEFT JOIN
    "returns".return_cycles rc
    ON
      rc.return_cycle_id = lprci.return_cycle_id
),
completed_void_return_logs AS (
  SELECT
    r.id
  FROM
    "returns"."returns" r
  INNER JOIN
    "returns".versions v
    ON
      v.return_log_id = r.id
  INNER JOIN
    lines_plus_return_cycles lprc
    ON
      lprc.licence_ref = r.licence_ref
      AND lprc.format_id = r.return_requirement
      AND lprc.return_cycle_start_date = r.start_date
      AND r.status = 'void'
),
combined_results AS (
  SELECT
    (concat_ws(':', lprc.external_id, lprc.return_cycle_id)) AS id,
    lprc.region_id,
    lprc.licence_id,
    lprc.licence_ref,
    lprc.area_code,
    lprc.water_undertaker,
    lprc.licence_end_date,
    lprc.external_id,
    lprc.return_requirement_id,
    lprc.format_id,
    lprc.reporting_frequency,
    lprc.summer,
    lprc.abstraction_period_start_day,
    lprc.abstraction_period_start_month,
    lprc.abstraction_period_end_day,
    lprc.abstraction_period_end_month,
    lprc.return_version_id,
    lprc.site_description,
    lprc.two_part_tariff,
    lprc.return_date,
    lprc.return_qty,
    lprc.return_cycle_id,
    lprc.return_cycle_start_date,
    lprc.return_cycle_end_date,
    lprc.return_cycle_due_date,
    r.return_id,
    r.id AS return_log_id
  FROM
    lines_plus_return_cycles lprc
  LEFT JOIN
    "returns"."returns" r
    ON
      r.licence_ref = lprc.licence_ref
      AND r.return_requirement = lprc.format_id
      AND r.start_date = lprc.return_cycle_start_date
      AND r.status = 'void'
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        completed_void_return_logs cvrl
      WHERE
        cvrl.id = r.id
    )
)
-- By SELECTing from our combined results, it makes it easier to filter and order them. These can be
-- changed as needed when working with the results.
SELECT
  *
FROM
  combined_results cr
WHERE cr.licence_ref IN ('6/33/40/*S/0070', '01/144')
ORDER BY
  cr.external_id ASC,
  cr.return_date ASC;
    `)
}

module.exports = {
  go
}
