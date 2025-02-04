'use strict'

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const moment = require('moment')

const db = require('../../../lib/connectors/db.js')
const { getReturnLogExists } = require('../lib/queries.js')
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
  const { return_id: returnId } = row

  const exists = await _returnExists(returnId)

  // Conditional update
  if (exists) {
    await returnsConnector.updateOne(returnId, _determineFieldsToBeUpdated(row))
  } else {
    // Insert
    await returnsConnector.create(row)

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (!config.isProduction && replicateReturns) {
      await ReplicateReturnsDataFromNaldForNonProductionEnvironments.go(row)
    }
  }
}

const _determineFieldsToBeUpdated = (row) => {
  const { end_date: endDate } = row

  if (moment(endDate).isBefore('2018-10-31')) {
    const { status, metadata, received_date: receivedDate, due_date: dueDate } = row

    return { status, metadata, received_date: receivedDate, due_date: dueDate }
  } else {
    const { metadata, due_date: dueDate } = row

    return { metadata, due_date: dueDate }
  }
}

async function _returnExists (returnId) {
  const [result] = await db.query(getReturnLogExists, [returnId])

  return result.exists
}

module.exports = {
  persistReturns
}
