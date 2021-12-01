'use strict';

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const { pick } = require('lodash');
const uuid = require('uuid/v4');
const moment = require('moment');
const returnsApi = require('../../../lib/connectors/returns');
const config = require('../../../../config');
const { getReturnId } = require('@envage/water-abstraction-helpers').returns;
const { pool } = require('../../../lib/connectors/db');
const { returns, versions, lines, deleteAllReturnsData } = returnsApi;
const { getLines, isNilReturn } = require('../lib/nald-queries/returns');
const { getLicenceFormats } = require('../transform-returns');
const importConnector = require('../../../modules/licence-import/extract/connectors');
const helpers = require('./transform-returns-helpers');
const returnVersionQueries = require('../../charging-import/lib/queries/return-versions');

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
    // If this is a non production environment, we will allow the importer to import
    // additional data points
    const keys = ['metadata', 'due_date'];
    if (config.isAcceptanceTestTarget) {
      keys.push('status', 'received_date', 'due_date');
    }
    return pick(row, keys);
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
  }
  // Insert
  return returns.create(row);
};

/**
 * Persists list of returns to API
 * @param {Array} inputReturns
 * @return {Promise} resolves when all processed
 */
const persistReturns = async (inputReturns) => {
  if (config.isAcceptanceTestTarget && config.import.nald.overwriteReturns) {
    for (const ret of inputReturns) {
      await deleteAllReturnsData(ret.return_id);
    }

    await Promise.all([
      pool.query(returnVersionQueries.importReturnVersions),
      pool.query(returnVersionQueries.importReturnRequirements),
      pool.query(returnVersionQueries.importReturnLinesFromNALD)
    ]);
  }

  for (const ret of inputReturns) {
    await createOrUpdateReturn(ret);
  }
};

exports.createOrUpdateReturn = createOrUpdateReturn;
exports.getUpdateRow = getUpdateRow;
exports.returnExists = returnExists;
exports.persistReturns = persistReturns;
