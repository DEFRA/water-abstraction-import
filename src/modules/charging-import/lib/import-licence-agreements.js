const moment = require('moment');
const helpers = require('@envage/water-abstraction-helpers');
const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries/agreements');
const bluebird = require('bluebird');
const { flatMap } = require('lodash');

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Maps a row of data from DB query into a cleaner form
 * @param {Object} row
 * @return {Object}
 */
const mapRow = row => ({
  licenceNumber: row.LIC_NO,
  financialAgreementCode: row.AFSA_CODE,
  startDate: moment(row.start_date).format(DATE_FORMAT),
  endDate: row.end_date ? moment(row.end_date).format(DATE_FORMAT) : null
});

/**
 * Maps and merges history of supplied rows of data where date ranges are adjacent,
 * and licence number/agreement code is identical
 * @param {Array} rows
 * @return {Array}
 */
const mapLicenceAgreements = rows => {
  const mapped = rows.map(mapRow);
  return helpers.charging.mergeHistory(mapped);
};

/**
 * Inserts a single row of licence agreement data into the water.licence_agreements
 * @param {Object} row
 * @return {Promise}
 */
const insertRow = row => {
  const params = [row.licenceNumber, row.financialAgreementCode, row.startDate, row.endDate];
  return pool.query(queries.insertLicenceAgreement, params);
};

/**
 * Gets account-level agreements from NALD import data
 * @return {Promise<Array>}
 */
const getAccountAgreements = async () => {
  const { rows } = await pool.query(queries.getAccountAgreements);
  return rows;
};

/**
 * Gets two-part tariff agreements from NALD import data
 * @return {Promise<Array>}
 */
const getTwoPartTariffAgreements = async () => {
  const { rows } = await pool.query(queries.getTwoPartTariffAgreements);
  return rows;
};

/**
 * Imports account-level and two-part tariff agreements from NALD data
 * and writes to water.licence_agreements
 * In NALD, section 130 are at account level, and section 127 are at charge element level
 * In the service, they are imported at licence level
 * @return {Promise}
 */
const importLicenceAgreements = async () => {
  const arr = await Promise.all([
    getAccountAgreements(),
    getTwoPartTariffAgreements()
  ]);

  const mapped = mapLicenceAgreements(flatMap(arr));

  return bluebird.each(mapped, insertRow);
};

exports.importLicenceAgreements = importLicenceAgreements;
