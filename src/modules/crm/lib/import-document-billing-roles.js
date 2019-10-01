const { groupBy, mapValues, flatMap, last } = require('lodash');
const moment = require('moment');
const { pool } = require('../../../lib/connectors/db');
const { logger } = require('../../../logger');

const queries = require('./queries');
const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Groups an array of rows by the document ID
 * @param {Array} data - retrieved from DB query
 * @return {Object} grouped by document ID
 */
const groupByDocumentId = data => groupBy(data, row => row.document_id);

/**
 * Predicate to determine if the invoice account ID for the provided row matches
 * the last row in the accumulator
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const isInvoiceAccountMatch = (acc, row) =>
  row.invoice_account_id === last(acc).invoiceAccountId;

/**
 * Predicate to determine if a new document billing role should be added to the
 * accumulator
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const shouldAddRow = (acc, row) =>
  (acc.length === 0) || !isInvoiceAccountMatch(acc, row);

/**
 * Predicate to determine if a the last row in the accumulator should be updated
 * @param {Array} acc - array.reduce accumulator
 * @param {Object} row - the current row in the reduce
 * @return {Boolean}
 */
const shouldUpdateRow = (acc, row) =>
  (acc.length > 0) && isInvoiceAccountMatch(acc, row);

/**
 * Gets start date considering both the licence start date and the charge version
 * start date.
 * The start date for the billing role is the maximum of these.
 * @param {Object} row - the current row in the reduce
 * @return {String} date format YYYY-MM-DD
 */
const getStartDate = row => {
  const timestamps = [row.start_date, row.cv_start_date].map(str => moment(str).unix());
  const max = Math.max(...timestamps);
  return moment.unix(max).format(DATE_FORMAT);
};

/**
 * Maps a single row from the data returned from the DB into a JS object
 * @param {Object} row
 * @return {Object}
 */
const mapRow = row => ({
  documentId: row.document_id,
  companyId: row.company_id,
  invoiceAccountId: row.invoice_account_id,
  roleId: row.role_id,
  startDate: getStartDate(row),
  endDate: row.cv_end_date
});

/**
 * Inserts a single row in the crm_v2.document_roles table using the provided data
 * @param {Object} row
 * @return {Promise}
 */
const insertBillingRole = row => {
  const params = [
    row.documentId,
    row.companyId,
    row.invoiceAccountId,
    row.roleId,
    row.startDate,
    row.endDate
  ];
  return pool.query(queries.documentRoles.insertBillingRole, params);
};

/**
 * Inserts multiple rows in the crm_v2.document_roles table using the provided data
 * @param {Array} arr
 * @return {Promise}
 */
const insertBillingRoles = async arr => {
  for (let row of arr) {
    try {
      await insertBillingRole(row);
    } catch (err) {
      // Note: currently we get a handful of errors because the IAS_CUST_REF is supposed
      // to have a unique party ID, but there are a few instances in NALD where it doesn't
      logger.error(`Error importing CRM billing role`, err, row);
    }
  }
};

/**
 * Givem an array of data loaded from the database, comprising a join between document roles
 * and charge versions, de-duplicates these where adjacent charge versions have the same
 * invoice account ID so that there is a minimal set of document roles
 * @param {Array} data
 * @return {Array} document billing roles
 */
const mapBillingRoles = data => {
  const groups = groupByDocumentId(data);
  const mapped = mapValues(groups, arr => arr.reduce((acc, row, i) => {
    // We need to add a new row if there is a change in invoice account ID
    if (shouldAddRow(acc, row)) {
      acc.push(mapRow(row));
    } else if (shouldUpdateRow(acc, row)) {
      // Otherwise we need to update the previous row end date
      last(acc).endDate = row.cv_end_date;
    }
    return acc;
  }, []));
  return flatMap(Object.values(mapped));
};

const importDocumentBillingRoles = async () => {
  const { rows } = await pool.query(queries.documents.getDocumentChargeVersions);
  const arr = mapBillingRoles(rows);
  return insertBillingRoles(arr);
};

exports._mapBillingRoles = mapBillingRoles;
exports.importDocumentBillingRoles = importDocumentBillingRoles;
