const { groupBy, mapValues, flatMap, last } = require('lodash');
const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries');
const { logger } = require('../../../logger');

const getKey = obj =>
  `${obj.company_id}_${obj.address_id}_${obj.contact_id}`;

/**
 * Predicate to determine if the licence holder for the provided row matches
 * the last row in the accumulator
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const isCompanyAddressContactMatch = (acc, row) =>
  getKey(row) === getKey(last(acc));

/**
 * Predicate to determine if a new document licence holder role should be added to the
 * accumulator
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const shouldAddRow = (acc, row) =>
  (acc.length === 0) || !isCompanyAddressContactMatch(acc, row);

/**
 * Predicate to determine if a the last row in the accumulator should be updated
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const shouldUpdateRow = (acc, row) =>
  (acc.length > 0) && isCompanyAddressContactMatch(acc, row);

/**
 * Reduces a single document's row data
 * @param {Array} arr
 */
const reduceGroup = arr => arr.reduce((acc, row) => {
  // We need to add a new row if there is a change in licence holder company/address
  if (shouldAddRow(acc, row)) {
    acc.push(row);
  } else if (shouldUpdateRow(acc, row)) {
    // Otherwise we need to update the previous row end date
    last(acc).end_date = row.end_date;
  }
  return acc;
}, []);

/**
 * Reduces raw data by merging adjacent rows for a document
 * where the company/address/contact is the same and
 * adjusting the end date of the previous row
 * @param {Array} data
 * @return {Array}
 */
const mapLicenceHolderRoles = data => {
  const documentGroups = groupBy(data, row => row.document_id);
  const mappedGroups = mapValues(documentGroups, reduceGroup);
  return flatMap(mappedGroups);
};

/**
 * Inserts a single licence holder document role in the CRM
 * @param  {Object} row - row of data
 * @return {Promise}
 */
const insertLicenceHolderRole = row => {
  const params = [
    row.document_id,
    row.company_id,
    row.contact_id,
    row.address_id,
    row.role_id,
    row.start_date,
    row.end_date
  ];
  return pool.query(queries.documentRoles.insertLicenceHolderRole, params);
};

/**
 * Inserts multiple licence holder document role records
 * @param  {Array}  arr - array of invoice account rows
 * @return {Promise}    - resolves when all inserted/failed
 */
const insertLicenceHolderRoles = async arr => {
  for (let row of arr) {
    try {
      await insertLicenceHolderRole(row);
    } catch (err) {
      logger.error(`Error importing CRM licence holder role`, err, row);
    }
  }
};

/**
 * Imports licence holder document roles into CRM v2 database
 * using the NALD_ABS_LIC_VERSIONS data
 */
const importLicenceHolderRoles = async () => {
  const { rows } = await pool.query(queries.documents.getLicenceHolderCompanies);
  const arr = mapLicenceHolderRoles(rows);
  await insertLicenceHolderRoles(arr);
};

exports.importLicenceHolderRoles = importLicenceHolderRoles;
