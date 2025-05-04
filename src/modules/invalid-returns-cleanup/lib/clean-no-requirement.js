'use strict'

const db = require('../../../lib/connectors/db.js')

/**
 * Cleans return logs with no submission data linked to deleted return requirements
 *
 * A user can create a return version and associated return format (return requirement in WRLS), then generate the form
 * logs (return logs-ish in WRLS!) These all get imported into WRLS.
 *
 * However, they then delete either the return format or the return version (and associated return formats) in NALD.
 * This 'orphans' the form logs in NALD and the return logs in WRLS (unlike licence data, return version data is cleaned
 * each night).
 *
 * The deletion of the return version or return format in NALD means the return log should never have existed. It is
 * safe to remove it as long as it has not been 'received' or 'completed'.
 *
 * The complication with the query is that there is no direct link between a return log and the return requirement. We
 * have `returns.return_requirement`, which is taken from `legacy_id` in the `water.return_requirements` table. But this
 * comes from NALD, and without the region code, is not unique to that return requirement. Another return requirement
 * (return format in NALD) in another region can have the same reference.
 */
async function go () {
  await _cleanReturns()
}

/**
 * We've not had to use temp tables before in a query but it was the only way to get this query to be anywhere near
 * performant.
 *
 * We tried EXISTS/NOT EXISTS and CTEs all with the guidance of ChatGPT. But the queries were taking more than 30 mins
 * to complete.
 *
 * By first putting the two datasets we are looking to combine into a temporary tables, this avoids PostgreSQL running
 * one query for each record in the other dataset (which seemed to be the issue when everything was dynamic).
 *
 * For those unaware, declaring the table as `TEMP` when created means PostgreSQL puts this in a special place intended
 * for use only by the session it was created in. The `ON COMMIT DROP` is some good housekeeping, which tells PostgreSQL
 * to drop the tables when the transaction the table was created in is 'committed'.
 */
async function _cleanReturns () {
  const query = `
    BEGIN;

    -- Create a table containing all licence references and the return requirement references linked to them
    CREATE TEMP TABLE licence_return_requirements(
      licence_ref VARCHAR,
      return_requirement VARCHAR
    ) ON COMMIT DROP;

    INSERT INTO licence_return_requirements
    SELECT
        l.licence_ref,
        rr.legacy_id::varchar AS return_requirement
      FROM
        water.return_requirements rr
      INNER JOIN water.return_versions rv
        ON rv.return_version_id = rr.return_version_id
      INNER JOIN water.licences l
        ON l.licence_id = rv.licence_id
    ;

    -- Create a table containing all un-submitted return logs which are candidates to be deleted
    CREATE TEMP TABLE return_log_candidates(
      return_id VARCHAR,
      licence_ref VARCHAR,
      return_requirement VARCHAR
    ) ON COMMIT DROP;

    INSERT INTO return_log_candidates
    SELECT
      r.return_id,
      r.licence_ref,
      r.return_requirement
    FROM
      "returns"."returns" r
    LEFT JOIN "returns".versions v
      ON v.return_id = r.return_id
    WHERE
      r.status IN ('void', 'due')
      AND v.version_id IS NULL
    ;

    -- Delete the candidate return logs whose licence ref and return requirement (reference) are not found in WRLS
    DELETE FROM "returns"."returns" r WHERE r.return_id IN (
      SELECT
        rlc.return_id
      FROM
        return_log_candidates rlc
      LEFT JOIN licence_return_requirements lrr
        ON lrr.licence_ref = rlc.licence_ref
        AND lrr.return_requirement = rlc.return_requirement
      WHERE
        lrr.return_requirement IS NULL
    );

    COMMIT;
  `

  await db.query(query)
}

module.exports = {
  go
}
