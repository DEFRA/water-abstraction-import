'use strict'

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const moment = require('moment')

const { replicateReturnsDataFromNaldForNonProductionEnvironments } = require('./returns-helper')
const returnsApi = require('../../../lib/connectors/returns')
const config = require('../../../../config')
const { returns } = returnsApi

/**
 * Checks whether return exists
 * @param {String} returnId - the return ID in the returns service
 * @return {Promise} resolves with boolean
 */
const returnExists = async (returnId) => {
  const { data } = await returns.findOne(returnId)
  if (data) {
    return true
  }
  return false
}

/**
 * Gets update data from row
 * @param {Object} row
 * @return {Object} row - with only fields that we wish to update set
 */
const getUpdateRow = (row) => {
  const { end_date: endDate } = row

  if (moment(endDate).isBefore('2018-10-31')) {
    const { status, metadata, received_date: receivedDate, due_date: dueDate } = row
    return { status, metadata, received_date: receivedDate, due_date: dueDate }
  } else {
    const { metadata, due_date: dueDate } = row
    return { metadata, due_date: dueDate }
  }
}

/**
 * Creates or updates return depending on whether start_date
 * @param {Object} row
 * @return {Promise} resolves when row is created/updated
 */
const createOrUpdateReturn = async (row, replicateReturns) => {
  const { return_id: returnId } = row

  const exists = await returnExists(returnId)

  // Conditional update
  if (exists) {
    return returns.updateOne(returnId, getUpdateRow(row))
  } else {
    // Insert
    const thisReturn = await returns.create(row)

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (!config.isProduction && replicateReturns) {
      await replicateReturnsDataFromNaldForNonProductionEnvironments(row)
    }
    return thisReturn
  }
}

/**
 * Persists list of returns to API
 * @param {Array} returns
 * @param {Boolean} replicateReturns
 * @return {Promise} resolves when all processed
 */
const persistReturns = async (returns, replicateReturns) => {
  for (const ret of returns) {
    if (!config.isProduction && replicateReturns) {
      await returnsApi.deleteAllReturnsData(ret.return_id)
    }
    await createOrUpdateReturn(ret, replicateReturns)
  }
}

module.exports = {
  createOrUpdateReturn,
  getUpdateRow,
  returnExists,
  persistReturns
}
