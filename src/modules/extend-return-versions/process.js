'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await _extendReturnVersions()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'extend-return-versions: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('extend-return-versions: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _extendReturnVersions () {
  const query = `-- Start by fetching the first return version for each licence.
--
-- Using the DISTINCT ON and ORDER BY, the query is fetching the oldest return version for
-- each licence.
WITH first_return_versions AS (
  SELECT DISTINCT ON (rv.licence_id)
    rv.licence_id,
    rv.return_version_id,
    rv.version_number,
    rv.start_date,
    rv.notes
  FROM
    water.return_versions rv
  WHERE
    rv.external_id IS NOT NULL
    AND EXISTS (
      SELECT
        1
      FROM
        water.return_requirements rr
      WHERE
        rr.return_version_id = rv.return_version_id
        AND rr.external_id IS NOT NULL
    )
  ORDER BY
    rv.licence_id ASC,
    rv.start_date ASC,
    rv.version_number ASC
),
-- Next, fetch the return requirements for each of the first return versions.
--
-- We have to grab the return requirements because that is the thing NALD submissions are
-- linked to which spans both systems.
--
-- For each we also grab the return version start date, and licence details.
imported_return_requirements AS (
  SELECT
    l.licence_id,
    l.licence_ref,
    frv.return_version_id,
    frv.version_number,
    rr.external_id,
    frv.start_date,
    frv.notes
  FROM
    water.return_requirements rr
  INNER JOIN
    first_return_versions frv
    ON frv.return_version_id = rr.return_version_id
  INNER JOIN
    water.licences l
    ON l.licence_id = frv.licence_id
  WHERE
    rr.external_id IS NOT NULL
),
-- Because the NALD return lines are split between those in the overnight extract and those in the
-- one-off extract we have to grab return line details from both places, starting with the one-off.
--
-- Using the DISTINCT ON and ORDER BY, the query is fetching the oldest return line for each
-- return requirement (format ID), where there is a value (including 0).
oneoff_return_lines AS (
  SELECT DISTINCT ON (nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID")
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    to_date(nrl."RET_DATE", 'DD/MM/YYYY') AS return_date
  FROM
    public."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
  ORDER BY
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    to_date(nrl."RET_DATE", 'DD/MM/YYYY') ASC
),
-- Does exactly the same as old_return_lines, only for overnight extract lines
overnight_return_lines AS (
  SELECT DISTINCT ON (nrl."FGAC_REGION_CODE", nrl."ARFL_ARTY_ID")
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') AS return_date
  FROM
    "import"."NALD_RET_LINES" nrl
  WHERE
    nrl."RET_QTY" IS NOT NULL
    AND nrl."RET_QTY" <> ''
    AND nrl."RET_QTY" <> 'null'
  ORDER BY
    nrl."FGAC_REGION_CODE",
    nrl."ARFL_ARTY_ID",
    to_date(nrl."RET_DATE", 'YYYYMMDDHH24MISS') ASC
),
-- Combine the results into a single result set
all_lines AS (
  SELECT * FROM oneoff_return_lines
  UNION ALL
  SELECT * FROM overnight_return_lines
),
-- We need to cater for any return requirements which feature in both the oneoff
-- and overnight results. With the all_lines results set, we again use a DISTINCT ON
-- and ORDER BY to return just one result per return requirement (format ID)
combined_lines AS (
  SELECT DISTINCT ON (al."FGAC_REGION_CODE", al."ARFL_ARTY_ID")
    concat_ws(':', al."FGAC_REGION_CODE", al."ARFL_ARTY_ID") AS external_id,
    al."ARFL_ARTY_ID" AS return_reference,
    al.return_date
  FROM
    all_lines al
  ORDER BY
    al."FGAC_REGION_CODE",
    al."ARFL_ARTY_ID",
    al.return_date ASC
),
-- We now combine the NALD return line results with the first results we grabbed: the
-- WRLS return requirements and associated data
combined_results AS (
  SELECT
    irr.licence_id,
    irr.licence_ref,
    irr.return_version_id,
    irr.version_number,
    irr.external_id,
    irr.start_date AS wrls_start_date,
    cl.return_date AS nald_return_date,
    irr.notes
  FROM
    imported_return_requirements irr
  INNER JOIN
    combined_lines cl
    ON cl.external_id = irr.external_id
),
-- A return version can have multiple return requirements, which means we'll have multiple
-- results per return version. We want to know the oldest to know whether we need to extend
-- the start date, and if so when to. So again, DISTINCT ON and ORDER BY to the rescue to
-- give us one results per return version, which will be the oldest.
--
-- We then compare the return line return date with the return version start date. If the
-- line is older than the return version, we flag it as needing extension.
distinct_results AS (
  SELECT DISTINCT ON (cr.return_version_id)
    cr.licence_id,
    cr.licence_ref,
    cr.return_version_id,
    cr.version_number,
    cr.external_id,
    cr.wrls_start_date,
    cr.nald_return_date,
    (CASE
      WHEN cr.nald_return_date < cr.wrls_start_date THEN TRUE
      ELSE FALSE
    END) AS needs_extending,
    concat_ws(
      CHR(10),
      cr.notes,
      concat(
        'Start date amended from ',
        to_char(cr.wrls_start_date, 'DD FMMonth YYYY'),
        ' to ',
        to_char(cr.nald_return_date, 'DD FMMonth YYYY'),
        ' on ',
        to_char(CURRENT_DATE, 'DD FMMonth YYYY'),
        ' as part of return data sync fix WATER-5595.'
      )
    ) AS updated_notes
  FROM
    combined_results cr
  ORDER BY
    cr.return_version_id ASC,
    cr.nald_return_date ASC
),
-- By SELECTing from our distinct results, it makes it easier to filter them
to_be_extended AS (
  SELECT
    dr.return_version_id,
    dr.nald_return_date,
    dr.wrls_start_date,
    dr.updated_notes
  FROM
    distinct_results dr
  WHERE
    dr.needs_extending = TRUE
)
UPDATE water.return_versions rv
SET
  start_date = tbe.nald_return_date,
  notes = tbe.updated_notes,
  date_updated = NOW()
FROM
  to_be_extended tbe
WHERE
  tbe.return_version_id = rv.return_version_id;`

  return db.query(query)
}

module.exports = {
  go
}
