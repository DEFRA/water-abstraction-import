'use strict'

/**
 * Updates matching return logs or creates missing ones based on those determined by the import from NALD data
 * @module
 */

const moment = require('moment')
const helpers = require('@envage/water-abstraction-helpers')

const db = require('../../../lib/connectors/db.js')
const ReplicateReturns = require('./replicate-returns.js')

/**
 * Updates matching return logs or creates missing ones based on those determined by the import from NALD data
 *
 * From 2018-10-31 WRLS took over from NALD as the place where all return submissions were entered. However, the return
 * log (the header record submissions are made against) is still generated in NALD, and changes to the return versions
 * that they are generated from will cause existing return logs to become VOID.
 *
 * Because of this the import service still needs to determine which return logs _should_ exist based on the current
 * return version and requirements data held against a licence each night.
 *
 * Having determined which return logs (rows) it think should exist, it passes them to this service to be imported into
 * WRLS. If a matching return log already exists, we just update some fields (it differs for some reason based on
 * whether it ends before or after the 2018 switch over date). Else, we create the new record.
 *
 * The next check is whether we should replicate the NALD submission data in WRLS. We only do this when there is no
 * submission in WRLS.
 *
 * For reference, we expect this to be the exception. All submissions are now done in WRLS so nothing should be added to
 * NALD. But in preparation for taking over returns management from NALD, we enabled this feature to ensure all the
 * historic NALD submission data, which to this point had been left in NALD, was imported into WRLS. Once that data is
 * imported, the only time we should replicate something is because someone didn't get the memo about where to enter
 * a submission!
 *
 * @param {object[]} rows - rows of return logs generated by the import
 * @param {boolean} oldLinesExist - whether the one-off extract of pre-2013 NALD return lines exists for use when
 * replicating NALD submission data
 */
async function go (rows, oldLinesExist) {
  for (const row of rows) {
    await _createOrUpdateReturn(row, oldLinesExist)
  }
}

async function _create (row, returnCycleId) {
  const params = [
    row.due_date,
    row.end_date,
    row.licence_ref,
    row.licence_type,
    row.metadata,
    row.received_date,
    row.regime,
    row.return_id,
    row.return_requirement,
    row.returns_frequency,
    row.source,
    row.start_date,
    row.status,
    returnCycleId
  ]

  const query = `
    INSERT INTO "returns"."returns" (
      due_date,
      end_date,
      licence_ref,
      licence_type,
      metadata,
      received_date,
      regime,
      return_id,
      return_requirement,
      returns_frequency,
      "source",
      start_date,
      status,
      return_cycle_id,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now());
  `

  await db.query(query, params)
}

async function _createOrUpdateReturn (row, oldLinesExist) {
  const returnDataExists = await _returnDataExists(row.return_id)

  // Conditional update
  if (returnDataExists.return_log_exists) {
    await _update(row)
  } else {
    const returnCycleId = await _returnCycleId(row)

    await _create(row, returnCycleId)
  }

  // NOTE: Until the change was made to replicate NALD submission data in WRLS, the import would just create the return
  // log record. Generally, those marked 'complete' would be dated pre 2028-10-31. We recently found out that the legacy
  // water-abstraction-service has logic to read the submission-data directly from NALD. Anything after 2018-10-31 was
  // directly entered into WRLS, as that is when it took over from NALD as the place to submit returns.
  //
  // Why do you need to know this? It is because irrespective of whether we have just created the return log for the
  // first time, or we are updating it for the thousandth (!) this might be the run where replicating return submission
  // data has been enabled, so we need to kick off the replication, as long as no existing data was found.
  if (!returnDataExists.return_submission_exists) {
    await ReplicateReturns.go(row, oldLinesExist)
  }
}

/**
 * Used to either find or create the return cycle for a return log being persisted
 *
 * Previously, this module would make a POST request to water-abstraction-returns with all the return log data _minus_
 * the return cycle ID.
 *
 * water-abstraction-returns has a `preInsert()` function it fires when a POST request is made to `/returns/1.0/returns`
 * that does the same as this.
 *
 * - work out the params for the return cycle based on the return log data
 * - fire an UPSERT query, i.e. always attempt to insert the return cycle but if a conflict error is raised (because it
 * already exists), just update its `date_updated. Either way return the return cycle ID
 *
 * In water-abstraction-returns, the `return_cycle_id` is then tagged onto the data passed in the request. In order
 * to move away from having to send API requests and instead make the changes directly, we needed to replicate this
 * process.
 *
 * @param {object} row the generated return log to be persisted
 *
 * @returns {string} the return cycle ID of the existing record
 *
 * @private
 */
async function _returnCycleId (row) {
  // TODO: For some reason the metadata for return logs that start before 2018-10-31 is passed to persistReturns() as
  // JSON, and for the rest it's an Object. If we can track it down there is no reason why all rows should not have
  // object based metadata. Till then we have this!
  const isSummer = row.metadata instanceof Object ? row.metadata.isSummer : JSON.parse(row.metadata).isSummer

  const startDate = helpers.returns.date.getPeriodStart(row.start_date, isSummer)
  const endDate = helpers.returns.date.getPeriodEnd(row.start_date, isSummer)

  const query = `
    INSERT INTO returns.return_cycles (
      start_date,
      end_date,
      due_date,
      is_summer,
      is_submitted_in_wrls,
      date_created
    )
    VALUES ($1, $2, $2::date + interval '28 day', $3, $2 >= '2018-10-31'::date, now())
    ON CONFLICT (start_date, end_date, is_summer) DO UPDATE SET date_updated=now()
    RETURNING return_cycle_id;
  `

  const results = await db.query(query, [startDate, endDate, isSummer])

  return results[0].return_cycle_id
}

async function _returnDataExists (returnId) {
  const params = [returnId]
  const query = `
    SELECT
      (EXISTS (SELECT 1 FROM "returns"."returns" WHERE return_id=$1)::bool) AS return_log_exists,
      (EXISTS (SELECT 1 FROM "returns".versions WHERE return_id=$1)::bool) AS return_submission_exists
    ;
  `
  const [result] = await db.query(query, params)

  return result
}

async function _update (row) {
  const params = [row.due_date, row.metadata]

  let query

  if (moment(row.end_date).isBefore('2018-10-31')) {
    params.push(row.received_date, row.status)
    query = 'UPDATE "returns"."returns" SET due_date=$1, metadata=$2, received_date=$3, status=$4, updated_at = now() WHERE return_id=$5;'
  } else {
    query = 'UPDATE "returns"."returns" SET due_date=$1, metadata=$2, updated_at = now() WHERE return_id=$3;'
  }

  params.push(row.return_id)

  await db.query(query, params)
}

module.exports = {
  go
}
