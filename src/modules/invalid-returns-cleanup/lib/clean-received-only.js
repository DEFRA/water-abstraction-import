'use strict'

const db = require('../../../lib/connectors/db.js')

/**
 * Cleans up returns that have been imported as nil returns but should have been received only
 *
 * > Currently only applies to return logs since 2024-04-01. There are many more older ones in the same state but it is
 * > still being decided what to do with those.
 *
 * In NALD, the form logs are generated at the start of the cycle. Like WRLS, you can apply a received date but not add
 * any quantities. However, in WRLS, we have a separate 'status' field that is set to 'received' at the same time. NALD
 * doesn't have this.
 *
 * When testing the historic NALD submission data in NALD, we found that we weren't correctly handling NALD lines with
 * zero and null quantities. Essentially, we were ignoring them when we needed to include them.
 *
 * But by doing so, it cannot differentiate between
 *
 * - A NALD form log where a user wants to record a received date
 * - A NALD form log that has been submitted, but where no values were provided
 *
 * So, it has interpreted these records as 'nil returns' in WRLS and set them to `COMPLETE`.
 *
 * This module cleans up any records that have been imported as nil returns but should have been received only
 */
async function go () {
  await _cleanReturns()
}

/**
 * We've used a temporary table here to allow us to ensure we that when we update the data, nothing becomes messed up
 * because one step fails. It also allows us to make this as performant as possible.
 */
async function _cleanReturns () {
  const query = `
    BEGIN;

    -- Create a table containing all the version and return IDs that should be received-only
    CREATE TEMP TABLE received_only_returns(
      return_id VARCHAR,
      version_id VARCHAR
    ) ON COMMIT DROP;

    INSERT INTO received_only_returns
    SELECT
      r.return_id,
      v.version_id
    FROM
      "returns"."returns" r
    INNER JOIN
      "returns".versions v ON v.return_id = r.return_id
    WHERE
      r.received_date IS NOT NULL
      AND r.start_date >= '2024-04-01'
      AND v.nil_return = TRUE
      AND v.user_type = 'system'
    AND NOT EXISTS (
      SELECT 1 FROM "returns".lines l WHERE l.quantity IS NOT NULL AND l.version_id = v.version_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "returns".versions v2 WHERE v2.version_number <> 1 AND v2.return_id = v.return_id
    );

    DELETE FROM "returns".lines l WHERE l.version_id IN (
      SELECT ror.version_id FROM received_only_returns ror
    );

    DELETE FROM "returns".versions v WHERE v.version_id IN (
      SELECT ror.version_id FROM received_only_returns ror
    );

    UPDATE "returns"."returns" SET
      "status" = 'received'
    WHERE
      return_id IN (
        SELECT ror.return_id FROM received_only_returns ror
      );

    COMMIT;
  `

  await db.query(query)
}

module.exports = {
  go
}
