'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const ReturnRequirements = require('./lib/requirements.js')
const ReturnRequirementPoints = require('./lib/points.js')
const ReturnRequirementPurposes = require('./lib/purposes.js')
const ReturnVersions = require('./lib/versions.js')

async function go (skip = false, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (skip) {
      global.GlobalNotifier.omg('return-versions-import: skipped')

      return
    }

    await ReturnVersions.go()
    await ReturnRequirements.go()
    await ReturnRequirementPurposes.go()
    await ReturnRequirementPoints.go()

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
