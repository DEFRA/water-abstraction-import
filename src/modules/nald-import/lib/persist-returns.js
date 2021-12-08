'use strict';

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const { pick } = require('lodash');
const moment = require('moment');
const uuid = require('uuid/v4');
const { pool } = require('../../../lib/connectors/db');
const returnsApi = require('../../../lib/connectors/returns');
const config = require('../../../../config');
const { returns, versions, lines } = returnsApi;

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
    const thisReturn = returns.create(row);
    if (config.isAcceptanceTestTarget && config.import.nald.overwriteReturns) {
      // create returns.versions
      const version = await versions.create({
        version_id: uuid(),
        return_id: row.return_id,
        user_id: 'imported@from.nald',
        user_type: 'system',
        version_number: JSON.parse(row.metadata).version,
        metadata: row.metadata,
        nil_return: false, // todo this isn't always false!
        current: JSON.parse(row.metadata).isCurrent
      });

      // create returns.lines
      // ARFL is under row.return_requirement
      const NaldReturnFormatQuery = await pool.query('SELECT * FROM import."NALD_RET_FORMATS" WHERE "ID" = $1', [row.return_requirement]);
      const NaldReturnFormat = NaldReturnFormatQuery.rows[0];

      const plainEnglishFrequency = (val) => {
        return {
          D: 'day',
          W: 'week',
          M: 'month',
          Y: 'year'
        }[val];
      };
      const padDateComponent = val => {
        if (val.length === 1) return `0${val}`;
        return val;
      };
      const NaldLinesForThisReturnVersion = await pool.query('SELECT * FROM import."NALD_RET_LINES" WHERE "ARFL_ARTY_ID" = $1 AND "ARFL_DATE_FROM" like $2', [row.return_requirement, `${moment(row.start_date).format('YYYY')}${padDateComponent(NaldReturnFormat.ABS_PERIOD_ST_MONTH)}${padDateComponent(NaldReturnFormat.ABS_PERIOD_ST_DAY)}%`]);

      NaldLinesForThisReturnVersion.rows.forEach(line => {
        const retDate = line.RET_DATE / 1000000;

        lines.create({
          line_id: uuid(),
          version_id: version.data.version_id,
          substance: 'water',
          quantity: parseFloat(line.RET_QTY),
          unit: 'm³',
          user_unit: 'Ml',
          start_date: moment(retDate, 'YYYY-MM-DD').subtract(1, NaldReturnFormat.ARTC_REC_FREQ_CODE).startOf(NaldReturnFormat.ARTC_REC_FREQ_CODE).format('YYYY-MM-DD'),
          end_date: moment(retDate, 'YYYY-MM-DD').format('YYYY-MM-DD'),
          time_period: plainEnglishFrequency(NaldReturnFormat.ARTC_REC_FREQ_CODE),
          metadata: JSON.stringify(line),
          reading_type: line.RETURN_FORM_TYPE === 'M' ? 'measured' : 'derived'
        });
      });
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

exports.createOrUpdateReturn = createOrUpdateReturn;
exports.getUpdateRow = getUpdateRow;
exports.returnExists = returnExists;
exports.persistReturns = persistReturns;
