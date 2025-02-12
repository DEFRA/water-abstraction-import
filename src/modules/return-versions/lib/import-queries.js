'use strict'

const importReturnVersions = `
  INSERT INTO water.return_versions (
    licence_id,
    version_number,
    start_date,
    end_date,
    status,
    external_id,
    date_created,
    date_updated
  )
  SELECT
    l.licence_id,
    nrv."VERS_NO"::integer AS version_number,
    to_date(nrv."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,
    CASE nrv."EFF_END_DATE"
      WHEN 'null' THEN NULL
      ELSE to_date(nrv."EFF_END_DATE", 'DD/MM/YYYY')
    END AS end_date,
    (
      CASE nrv."STATUS"
        WHEN 'SUPER' THEN 'superseded'
        WHEN 'DRAFT' THEN 'draft'
        WHEN 'CURR' THEN 'current'
      END
    )::water.return_version_status AS status,
    concat_ws(':', nrv."FGAC_REGION_CODE", nrv."AABL_ID", nrv."VERS_NO") AS external_id,
    NOW() AS date_created,
    NOW() AS date_updated
  FROM
    import."NALD_RET_VERSIONS" nrv
  JOIN import."NALD_ABS_LICENCES" nl
    ON nrv."AABL_ID" = nl."ID"
    AND nrv."FGAC_REGION_CODE" = nl."FGAC_REGION_CODE"
  JOIN water.licences l
    ON l.licence_ref = nl."LIC_NO"
  ON CONFLICT (external_id) DO
  UPDATE SET
    licence_id = excluded.licence_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    date_updated = excluded.date_updated;
`

const importReturnRequirements = `insert into water.return_requirements  ( return_version_id, legacy_id,  abstraction_period_start_day, abstraction_period_start_month,
  abstraction_period_end_day,
  abstraction_period_end_month,
  site_description,
  description,
  is_summer,
  is_upload,
  external_id,
  returns_frequency,
  reporting_frequency,
  collection_frequency,
  two_part_tariff,
  date_created,
  date_updated
  ) select  rv.return_version_id,
  nrf."ID"::integer as legacy_id,
  nullif(nrf."ABS_PERIOD_ST_DAY", 'null')::smallint as abstraction_period_start_day,
  nullif(nrf."ABS_PERIOD_ST_MONTH", 'null')::smallint as abstraction_period_start_month,
  nullif(nrf."ABS_PERIOD_END_DAY", 'null')::smallint as abstraction_period_end_day,
  nullif(nrf."ABS_PERIOD_END_MONTH", 'null')::smallint as abstraction_period_end_month,
  nullif(nrf."SITE_DESCR", 'null') as site_description,
  nullif(nrf."DESCR", 'null') as description,
  nrf."FORM_PRODN_MONTH" in ('65', '45', '80') as is_summer,
  nrf."FORM_PRODN_MONTH" in ('65', '66') as is_upload,
  concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") as external_id,
  (case nrf."ARTC_RET_FREQ_CODE"
    when 'D' then 'day'
    when 'W' then 'week'
    when 'F' then 'fortnight'
    when 'M' then 'month'
    when 'Q' then 'quarter'
    when 'A' then 'year'
    end
  )::water.returns_frequency as returns_frequency,
  (case nrf."ARTC_REC_FREQ_CODE"
    when 'D' then 'day'
    when 'W' then 'week'
    when 'F' then 'fortnight'
    when 'M' then 'month'
    when 'Q' then 'quarter'
    when 'A' then 'year'
    end
  ) as reporting_frequency,
  (case nrf."ARTC_CODE"
    when 'D' then 'day'
    when 'W' then 'week'
    when 'F' then 'fortnight'
    when 'M' then 'month'
    when 'Q' then 'quarter'
    when 'A' then 'year'
    end
  ) as collection_frequency,
  (case
    when nrf."TPT_FLAG" = 'Y' then TRUE
    else FALSE
    end) as two_part_tariff,
  now() as date_created,
  now() as date_updated from import."NALD_RET_FORMATS" nrf join water.return_versions rv on concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ARVN_AABL_ID", nrf."ARVN_VERS_NO")=rv.external_id on conflict(external_id) do update  set
  abstraction_period_start_day=excluded.abstraction_period_start_day,
  abstraction_period_start_month=excluded.abstraction_period_start_month,
  abstraction_period_end_day=excluded.abstraction_period_end_day,
  abstraction_period_end_month=excluded.abstraction_period_end_month,
  site_description=excluded.site_description,
  description=excluded.description,
  is_summer=excluded.is_summer,
  is_upload=excluded.is_upload,
  returns_frequency=excluded.returns_frequency,
  reporting_frequency=excluded.reporting_frequency,
  collection_frequency=excluded.collection_frequency,
  two_part_tariff=excluded.two_part_tariff,
  date_updated=excluded.date_updated;`

const importReturnRequirementPurposes = `insert into water.return_requirement_purposes (
  return_requirement_id,
  purpose_primary_id,
  purpose_secondary_id,
  purpose_use_id,
  external_id,
  purpose_alias,
  date_created,
  date_updated
) select  r.return_requirement_id,
p.purpose_primary_id,
s.purpose_secondary_id,
u.purpose_use_id,
concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID", nrp."APUR_APPR_CODE", nrp."APUR_APSE_CODE", nrp."APUR_APUS_CODE") as external_id,
nullif(nrp."PURP_ALIAS", 'null') as purpose_alias,
now() as date_created,
now() as date_updated from import."NALD_RET_FMT_PURPOSES" nrp
join water.purposes_primary p on nrp."APUR_APPR_CODE"=p.legacy_id
join water.purposes_secondary s on nrp."APUR_APSE_CODE"=s.legacy_id
join water.purposes_uses u on nrp."APUR_APUS_CODE"=u.legacy_id
join water.return_requirements r on r.external_id = concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID") on conflict(external_id) do update set  purpose_alias=excluded.purpose_alias, date_updated=excluded.date_updated;
`

const importReturnVersionsMultipleUpload = `update water.return_versions
set multiple_upload = distinctReturnRequirements.is_upload
from (
  select distinct on (rr.return_version_id) rr.return_version_id, rr.is_upload
  from water.return_requirements rr
) as distinctReturnRequirements
where water.return_versions.return_version_id = distinctReturnRequirements.return_version_id;
`

// NOTE: Our first attempt used a sub-query to generate the note but was too slow. So, we've used a solution we also
// applied to a mod logs query: a common table expression (CTE).
//
// The sub-query version locally took more than 5 minutes. This version with the CTE took 2 seconds!
const importReturnVersionsCreateNotesFromDescriptions = `
  WITH aggregated_notes AS (
    SELECT
      rr.return_version_id,
      string_agg(rr.description, ', ') AS notes
    FROM
      water.return_requirements rr
    WHERE
      rr.description IS NOT NULL
    GROUP BY
      rr.return_version_id
  )
  UPDATE
    water.return_versions rv
  SET
    notes = an.notes
  FROM
    aggregated_notes an
  WHERE
    rv.return_version_id = an.return_version_id
    AND rv.notes IS NULL;
`

const importReturnVersionsCorrectStatusForWrls = `UPDATE water.return_versions
SET status = 'current'
WHERE status = 'superseded'
AND return_version_id NOT IN (SELECT rv.return_version_id
FROM water.return_versions rv
INNER JOIN water.return_versions rv2
  ON rv.licence_id = rv2.licence_id
    AND rv.start_date = rv2.start_date
    AND rv.return_version_id != rv2.return_version_id
    AND rv.version_number < rv2.version_number
WHERE rv.end_date IS NOT NULL);
`

const importReturnVersionsSetToDraftMissingReturnRequirements = `UPDATE water.return_versions
SET status = 'draft'
WHERE status = 'current'
AND (
  reason IS NULL
  OR reason NOT IN ('abstraction-below-100-cubic-metres-per-day', 'licence-conditions-do-not-require-returns', 'returns-exception', 'temporary-trade')
)
AND return_version_id NOT IN (
  SELECT DISTINCT return_version_id FROM water.return_requirements
);
`

const importReturnVersionsAddMissingReturnVersionEndDates = `UPDATE water.return_versions rv
SET end_date = bq.new_end_date
FROM (SELECT rv.return_version_id,
(SELECT rv3.start_date - 1 FROM water.return_versions rv3 WHERE rv3.licence_id = madness.licence_id AND rv3.version_number = madness.min_version) AS new_end_date
FROM water.return_versions rv
INNER JOIN (SELECT no_end.return_version_id, rv1.licence_id, min(rv1.version_number) AS min_version
  FROM water.return_versions rv1
  INNER JOIN (SELECT rv2.return_version_id, rv2.licence_id, rv2.version_number
    FROM water.return_versions rv2
    INNER JOIN (SELECT licence_id, max(version_number) AS max_version
      FROM water.return_versions
      WHERE status != 'draft'
      GROUP BY licence_id) AS lv
    ON rv2.licence_id = lv.licence_id
    AND rv2.version_number != lv.max_version
    WHERE rv2.end_date IS NULL) AS no_end
  ON rv1.licence_id = no_end.licence_id
  AND rv1.version_number > no_end.version_number
  GROUP BY rv1.licence_id, no_end.return_version_id) AS madness
ON rv.return_version_id = madness.return_version_id) AS bq
WHERE rv.return_version_id = bq.return_version_id;
`

module.exports = {
  importReturnVersions,
  importReturnRequirements,
  importReturnRequirementPurposes,
  importReturnVersionsCreateNotesFromDescriptions,
  importReturnVersionsMultipleUpload,
  importReturnVersionsCorrectStatusForWrls,
  importReturnVersionsSetToDraftMissingReturnRequirements,
  importReturnVersionsAddMissingReturnVersionEndDates
}
