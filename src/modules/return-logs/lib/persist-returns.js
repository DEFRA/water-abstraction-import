'use strict'

/**
 * Creates or updates return cycle via returns API based on the return end date
 * @module
 */

const moment = require('moment')

const db = require('../../../lib/connectors/db.js')
const { getReturnLogExists, updatePostNov2018ReturnLog, updatePreNov2018ReturnLog } = require('../lib/queries.js')
const ReplicateReturnsDataFromNaldForNonProductionEnvironments = require('./replicate-returns.js')
const { returns: returnsConnector } = require('../../../lib/connectors/returns.js')

const config = require('../../../../config')

/**
 * Persists list of returns to API
 *
 * @param {object[]} returns
 * @param {boolean} replicateReturns
 */
async function persistReturns (returns, replicateReturns) {
  for (const ret of returns) {
    if (!config.isProduction && replicateReturns) {
      await returnsConnector.deleteAllReturnsData(ret.return_id)
    }

    await _createOrUpdateReturn(ret, replicateReturns)
  }
}

async function _createOrUpdateReturn (row, replicateReturns) {
  const exists = await _returnExists(row.return_id)

  // Conditional update
  if (exists) {
    await _update(row)
  } else {
    // Insert
    await returnsConnector.create(row)

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (!config.isProduction && replicateReturns) {
      await ReplicateReturnsDataFromNaldForNonProductionEnvironments.go(row)
    }
  }
}

async function _returnExists (returnId) {
  const [result] = await db.query(getReturnLogExists, [returnId])

  return result.exists
}

async function _update (row) {
  const params = [row.due_date, row.metadata]

  let query

  if (moment(row.end_date).isBefore('2018-10-31')) {
    params.push(row.received_date, row.status)
    query = updatePreNov2018ReturnLog
  } else {
    query = updatePostNov2018ReturnLog
  }

  params.push(row.return_id)

  await db.query(query, params)
}

module.exports = {
  persistReturns
}
