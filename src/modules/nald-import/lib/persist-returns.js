'use strict';

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const { pick } = require('lodash');
const moment = require('moment');

const { replicateReturnsDataFromNaldForNonProductionEnvironments } = require('./returns-helper');
const returnsApi = require('../../../lib/connectors/returns');
const config = require('../../../../config');
const { returns } = returnsApi;

/**
 * Checks whether return exists
 * @param {String} returnId - the return ID in the returns service
 * @return {Promise} resolves with boolean
 */
const returnExists = async (returnId) => {
  const { data } = await returns.findOne(returnId);
  if (data) {
    return true;
  }
  return false;
};

/**
 * Gets update data from row
 * @param {Object} row
 * @return {Object} row - with only fields that we wish to update set
 */
const getUpdateRow = (row) => {
  const { end_date: endDate } = row;

  if (moment(endDate).isBefore('2018-10-31')) {
    return pick(row, ['status', 'metadata', 'received_date', 'due_date']);
  } else {
    return pick(row, ['metadata', 'due_date']);
  }
};

/**
 * Creates or updates return depending on whether start_date
 * @param {Object} row
 * @return {Promise} resolves when row is created/updated
 */
const createOrUpdateReturn = async row => {
  const { return_id: returnId } = row;

  const exists = await returnExists(returnId);

  // Conditional update
  if (exists) {
    return returns.updateOne(returnId, getUpdateRow(row));
  } else {
    // Insert
    const thisReturn = await returns.create(row);

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (config.isAcceptanceTestTarget && config.import.nald.overwriteReturns) {
      await replicateReturnsDataFromNaldForNonProductionEnvironments(row);
    }
    return thisReturn;
  }
};

/**
 * Persists list of returns to API
 * @param {Array} returns
 * @return {Promise} resolves when all processed
 */
const persistReturns = async (returns) => {
  for (const ret of returns) {
    if (config.isAcceptanceTestTarget && config.import.nald.overwriteReturns) {
      await returnsApi.deleteAllReturnsData(ret.return_id);
    }
    await createOrUpdateReturn(ret);
  }
};

module.exports = {
  createOrUpdateReturn,
  getUpdateRow,
  returnExists,
  persistReturns
};
