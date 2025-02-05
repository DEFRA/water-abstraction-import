'use strict'

/**
 * Creates or updates return cycle via returns API based on the return end date
 * @module
 */

const helpers = require('@envage/water-abstraction-helpers')
const moment = require('moment')

const db = require('../../../lib/connectors/db.js')
const ReplicateReturnsDataFromNaldForNonProductionEnvironments = require('./replicate-returns.js')
const { returns: returnsConnector } = require('../../../lib/connectors/returns.js')

const config = require('../../../../config')

/**
 * Persists list of returns to API
 *
 * @param {object[]} returns
 * @param {boolean} replicateReturns
 */
async function go (returns, replicateReturns) {
  for (const ret of returns) {
    if (!config.isProduction && replicateReturns) {
      await returnsConnector.deleteAllReturnsData(ret.return_id)
    }

    await _createOrUpdateReturn(ret, replicateReturns)
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

async function _createOrUpdateReturn (row, replicateReturns) {
  const exists = await _returnExists(row.return_id)

  // Conditional update
  if (exists) {
    await _update(row)
  } else {
    const returnCycleId = await _returnCycleId(row)

    await _create(row, returnCycleId)

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (!config.isProduction && replicateReturns) {
      await ReplicateReturnsDataFromNaldForNonProductionEnvironments.go(row)
    }
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

async function _returnExists (returnId) {
  const [result] = await db.query(
    'SELECT EXISTS (SELECT 1 FROM "returns"."returns" WHERE return_id=$1)::bool;',
    [returnId]
  )

  return result.exists
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
