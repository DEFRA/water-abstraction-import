'use strict';

/**
 * Creates or updates return cycle via returns API based on the return end date
 */
const { pick } = require('lodash');
const { logger } = require('../../../logger');
const moment = require('moment');
const lodash = require('lodash');
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
    const thisReturn = await returns.create(row);

    /* For non-production environments, we allow the system to import the returns data so we can test billing */
    if (config.isAcceptanceTestTarget && config.import.nald.overwriteReturns) {
      // create returns.versions
      const version = await versions.create({
        version_id: uuid(),
        return_id: row.return_id,
        user_id: 'imported@from.nald',
        user_type: 'system',
        version_number: JSON.parse(row.metadata).version,
        metadata: row.metadata,
        nil_return: false,
        current: JSON.parse(row.metadata).isCurrent
      });

      const naldReturnFormatQuery = await pool.query('SELECT * FROM import."NALD_RET_FORMATS" WHERE "ID" = $1', [row.return_requirement]);
      const naldReturnFormat = naldReturnFormatQuery.rows[0];

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

      const naldLinesFromNaldReturnFormLogs = await pool.query('SELECT * FROM import."NALD_RET_FORM_LOGS" WHERE "ARTY_ID" = $1 AND "DATE_FROM" = $2', [
        row.return_requirement,
        `${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_DAY)}/${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_MONTH)}/${moment(row.start_date).format('YYYY')}`
      ]);

      const returnLinesFromNaldReturnLines = await pool.query('SELECT * FROM import."NALD_RET_LINES" WHERE "ARFL_ARTY_ID" = $1 AND "ARFL_DATE_FROM" >= $2 AND "ARFL_DATE_FROM" < $3', [
        row.return_requirement,
        `${moment(row.start_date).format('YYYY')}${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_MONTH)}${padDateComponent(naldReturnFormat.ABS_PERIOD_ST_DAY)}000000`,
        `${moment(row.start_date).format('YYYY')}${padDateComponent(naldReturnFormat.ABS_PERIOD_END_MONTH)}${padDateComponent(naldReturnFormat.ABS_PERIOD_END_DAY)}000000`
      ]);

      let mode = 0;
      let qtyKey;
      let iterable;

      if (returnLinesFromNaldReturnLines.rows.length > 0) {
        qtyKey = 'RET_QTY';
        mode = 1;
        iterable = returnLinesFromNaldReturnLines.rows;
      } else if (naldLinesFromNaldReturnFormLogs.rows.length > 0) {
        qtyKey = 'MONTHLY_RET_QTY';
        mode = 2;
        iterable = naldLinesFromNaldReturnFormLogs.rows;
      } else {
        iterable = [];
      }
      const sumOfLines = lodash.sum(iterable.map(a => parseFloat(a[qtyKey])).filter(n => ![null, undefined, NaN].includes(n)));

      logger.info(`Return ${version.data.return_id} has ${iterable.length} lines`);
      if (sumOfLines === 0) {
        logger.info(`Return ${version.data.return_id} is being marked as a nil return`);
        await versions.updateOne(version.data.version_id, { nil_return: true }, ['nil_return']);
      } else {
        logger.info(`Return ${version.data.return_id} has lines which will now be created`);

        iterable.forEach((line, n) => {
          let startDate;
          let endDate;

          if (mode === 1) {
            startDate = moment(line.RET_DATE, 'YYYYMMDD000000').format('YYYY-MM-DD');
            endDate = moment(line.RET_DATE, 'YYYYMMDD000000').add(n, plainEnglishFrequency(naldReturnFormat.ARTC_REC_FREQ_CODE)).format('YYYY-MM-DD');
          }
          if (mode === 2) {
            startDate = moment(line.FORM_PROD_ST_DATE, 'DD/MM/YYYY').startOf(plainEnglishFrequency(naldReturnFormat.ARTC_REC_FREQ_CODE)).format('YYYY-MM-DD');
            endDate = moment(line.FORM_PROD_ST_DATE, 'DD/MM/YYYY').startOf(plainEnglishFrequency(naldReturnFormat.ARTC_REC_FREQ_CODE)).add(n, plainEnglishFrequency(naldReturnFormat.ARTC_REC_FREQ_CODE)).format('YYYY-MM-DD');
          }
          logger.info(`Return ${version.data.return_id}: Importing lines ${n} of ${iterable.length}`);

          lines.create({
            line_id: uuid(),
            version_id: version.data.version_id,
            substance: 'water',
            quantity: parseFloat(line[qtyKey]),
            unit: 'm³',
            user_unit: 'm³',
            start_date: startDate,
            end_date: endDate,
            time_period: plainEnglishFrequency(naldReturnFormat.ARTC_REC_FREQ_CODE),
            metadata: JSON.stringify(line),
            reading_type: line.RETURN_FORM_TYPE === 'M' ? 'measured' : 'derived'
          });
        });
      }
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
