'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go(skip = false, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (skip) {
      global.GlobalNotifier.omg('return-versions-import: skipped')

      return
    }

    await _returnVersions()
    await _returnRequirements()
    await _returnRequirementPurposes()
    await _returnRequirementPoints()

    await _applyMultipleUploadFlag()
    await _createNotesFromDescriptions()
    await _correctStatusForWrls()
    await _setToDraftMissingReturnRequirements()
    await _addMissingReturnVersionEndDates()
    await _linkReturnVersionsToModLogs()
    await _updateReturnVersionReasons()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'return-versions-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('return-versions-import: errored', error)
  }
}

async function _returnVersions () {
  await db.query(`
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
  `)
}

async function _returnRequirements () {
  await db.query(`
    insert into water.return_requirements  (
      return_version_id,
      legacy_id,
      abstraction_period_start_day,
      abstraction_period_start_month,
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
    )
    select
      rv.return_version_id,
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
      now() as date_updated
    from
      "import"."NALD_RET_FORMATS" nrf
    join water.return_versions rv
      on concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ARVN_AABL_ID", nrf."ARVN_VERS_NO")=rv.external_id
    on conflict(external_id) do update set
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
      date_updated=excluded.date_updated;
  `)
}

async function _returnRequirementPurposes () {
  await db.query(`
    insert into water.return_requirement_purposes (
      return_requirement_id,
      purpose_primary_id,
      purpose_secondary_id,
      purpose_use_id,
      external_id,
      purpose_alias,
      date_created,
      date_updated
    )
    select
      r.return_requirement_id,
      p.purpose_primary_id,
      s.purpose_secondary_id,
      u.purpose_use_id,
      concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID", nrp."APUR_APPR_CODE", nrp."APUR_APSE_CODE", nrp."APUR_APUS_CODE") as external_id,
      nullif(nrp."PURP_ALIAS", 'null') as purpose_alias,
      now() as date_created,
      now() as date_updated
    from
      "import"."NALD_RET_FMT_PURPOSES" nrp
    join water.purposes_primary p
      on nrp."APUR_APPR_CODE"=p.legacy_id
    join water.purposes_secondary s
      on nrp."APUR_APSE_CODE"=s.legacy_id
    join water.purposes_uses u
      on nrp."APUR_APUS_CODE"=u.legacy_id
    join water.return_requirements r
      on r.external_id = concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID")
    on conflict(external_id) do update
    set
      purpose_alias=excluded.purpose_alias,
      date_updated=excluded.date_updated;
  `)
}

async function _returnRequirementPoints () {
  await db.query(`
    INSERT INTO water.return_requirement_points (
      return_requirement_id,
      external_id,
      point_id
    )
    SELECT
      rr.return_requirement_id,
      concat_ws(':', nrfp."FGAC_REGION_CODE", nrfp."ARTY_ID", nrfp."AAIP_ID") AS external_id,
      p.id AS point_id
    FROM
      "import"."NALD_RET_FMT_POINTS" nrfp
    INNER JOIN
      water.return_requirements rr
      ON nrfp."FGAC_REGION_CODE"=split_part(rr.external_id, ':',1)
      AND nrfp."ARTY_ID"=split_part(rr.external_id, ':',2)
    INNER JOIN
      water.points p
      ON nrfp."FGAC_REGION_CODE"=split_part(p.external_id, ':',1)
      AND nrfp."AAIP_ID"=split_part(p.external_id, ':',2)
    ON CONFLICT(external_id) DO UPDATE SET
      point_id = excluded.point_id;
  `)
}

async function _applyMultipleUploadFlag () {
  await db.query(`
    update water.return_versions
    set multiple_upload = distinctReturnRequirements.is_upload
    from (
      select distinct on (rr.return_version_id) rr.return_version_id, rr.is_upload
      from water.return_requirements rr
    ) as distinctReturnRequirements
    where water.return_versions.return_version_id = distinctReturnRequirements.return_version_id;
  `)
}

async function _createNotesFromDescriptions () {
  // NOTE: Our first attempt used a sub-query to generate the note but was too slow. So, we've used a solution we also
  // applied to a mod logs query: a common table expression (CTE).
  //
  // The sub-query version locally took more than 5 minutes. This version with the CTE took 2 seconds!
  await db.query(`
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
  `)
}

async function _correctStatusForWrls () {
  await db.query(`
    UPDATE water.return_versions
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
  `)
}

async function _setToDraftMissingReturnRequirements () {
  await db.query(`
    UPDATE water.return_versions
    SET status = 'draft'
    WHERE status = 'current'
    AND (
      reason IS NULL
      OR reason NOT IN ('abstraction-below-100-cubic-metres-per-day', 'licence-conditions-do-not-require-returns', 'returns-exception', 'temporary-trade')
    )
    AND return_version_id NOT IN (
      SELECT DISTINCT return_version_id FROM water.return_requirements
    );
  `)
}

async function _addMissingReturnVersionEndDates () {
  await db.query(`
    UPDATE water.return_versions rv
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
  `)
}

async function _linkReturnVersionsToModLogs () {
  // This will link any newly imported mod log records to their return versions based on the external ID against each
  // one
  await db.query(`
    UPDATE water.mod_logs ml
    SET return_version_id = rv.return_version_id
    FROM water.return_versions rv
    WHERE rv.external_id = ml.return_version_external_id
    AND ml.return_version_id IS NULL;
  `)
}

async function _updateReturnVersionReasons () {
  // NOTE: Initial attempts to create this query were too slow. The issue is that a return version can be linked to
  // multiple mod log records. We were using a sub-query with a limit and these 2 approaches were the root cause.
  // Thankfully, we find only the originating entry seems to have a reason code when there are multiple mod logs. That
  // was the primary reason for using a sub-query. Chat-GPT suggested we tried using a common table expression (CTE) to
  // create a table we then JOIN to in the update rather than a sub-query. CTEs are temporary tables that exist just
  // within the scope of the query.
  //
  // This was a massive performance boost (> 10 mins to < 5 secs) for the first run. After that the timing comes down to
  // milliseconds.
  //
  // For the eagle eye, yes, our CASE statement covers more reasons than we include in the `WHERE IN` clause. We felt
  // this would serve as a handy reference what the agreed mappings were for _all_ NALD reason codes.
  await db.query(`
    WITH selected_reasons AS (
      SELECT
        ml.return_version_id,
        CASE
          WHEN ml.reason_code = 'AMND' THEN NULL
          WHEN ml.reason_code = 'MIGR' THEN NULL
          WHEN ml.reason_code = 'NAME' THEN 'name-or-address-change'
          WHEN ml.reason_code = 'NEWL' THEN 'new-licence'
          WHEN ml.reason_code = 'NEWP' THEN 'new-licence-in-part-succession-or-licence-apportionment'
          WHEN ml.reason_code = 'REDS' THEN NULL
          WHEN ml.reason_code = 'SPAC' THEN 'change-to-special-agreement'
          WHEN ml.reason_code = 'SPAN' THEN 'new-special-agreement'
          WHEN ml.reason_code = 'SREM' THEN 'succession-to-remainder-licence-or-licence-apportionment'
          WHEN ml.reason_code = 'SUCC' THEN 'succession-or-transfer-of-licence'
          WHEN ml.reason_code = 'VARF' THEN 'major-change'
          WHEN ml.reason_code = 'VARM' THEN 'minor-change'
          WHEN ml.reason_code = 'XCORR' THEN 'error-correction'
          WHEN ml.reason_code = 'XRET' THEN 'change-to-return-requirements'
          WHEN ml.reason_code = 'XRETM' THEN 'change-to-return-requirements'
          ELSE NULL
        END AS mapped_reason
      FROM
        water.mod_logs ml
      JOIN
        water.return_versions rv ON rv.return_version_id = ml.return_version_id
      WHERE
        ml.reason_code IN ('NAME', 'NEWL', 'NEWP', 'SPAC', 'SPAN', 'SREM', 'SUCC', 'VARF', 'VARM', 'XCORR', 'XRET', 'XRETM')
        AND rv.reason IS NULL
      ORDER BY
        ml.external_id ASC
    )
    UPDATE water.return_versions rv
    SET reason = sr.mapped_reason
    FROM selected_reasons sr
    WHERE rv.return_version_id = sr.return_version_id
    AND rv.reason IS NULL;
  `)
}

module.exports = {
  go
}
