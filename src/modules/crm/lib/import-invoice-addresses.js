const { groupBy, mapValues, flatMap, last, get } = require('lodash');
const moment = require('moment');
const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries');
const { logger } = require('../../../logger');

const DATE_FORMAT = 'YYYY-MM-DD';

const groupByIASNumber = data => groupBy(data, row => row.IAS_CUST_REF);

const groupByDate = data => groupBy(data, row => row.start_date);

/**
 * Maps the address changes into the minimum possible set of rows
 * Where an address is the same for adjacent rows, they are merged.
 * End date on preceding row set to 1 day before start date of current row
 * @param  {Array} rows - row data from DB query
 * @return {Array}      - de-duplicated/mapped data for insertion to CRM
 */
const deduplicateAddressChanges = rows => {
  const grouped = mapValues(groupByIASNumber(rows), rows => {
    const dateGroups = groupByDate(rows);

    // Select the last change that happened on a particular date
    const uniqueDateRows = Object.values(dateGroups).map(last);

    // Remove duplicate consecutive address rows
    const uniqueAddressRows = uniqueDateRows.reduce((acc, row, i) => {
      if (acc.length === 0 || (row.ACON_AADD_ID !== acc[acc.length - 1].ACON_AADD_ID)) {
        acc.push(row);
      }
      return acc;
    }, []);

    // Add end dates - 1 day before the start date of the next row
    return uniqueAddressRows.map((row, i) => {
      const nextStart = get(uniqueAddressRows, `${i + 1}.start_date`, null);
      const endDate = nextStart ? moment(nextStart).subtract(1, 'day').format(DATE_FORMAT) : null;
      return {
        ...row,
        endDate
      };
    });
  });

  // Convert groups back to a flat array
  return flatMap(Object.values(grouped));
};

/**
 * Inserts an invoice account record in the CRM
 * @param  {Object} row - row of data
 * @return {Promise}
 */
const insertInvoiceAddress = row => {
  const params = [
    row.invoice_account_id,
    row.address_id,
    row.start_date,
    row.endDate
  ];
  return pool.query(queries.invoiceAccountAddresses.insertInvoiceAccountAddress, params);
};

/**
 * Inserts multiple invoice account records
 * @param  {Array}  arr - array of invoice account rows
 * @return {Promise}    - resolves when all inserted/failed
 */
const insertInvoiceAddresses = async arr => {
  for (let row of arr) {
    try {
      await insertInvoiceAddress(row);
    } catch (err) {
      // Note: currently we get a handful of errors because the IAS_CUST_REF is supposed
      // to have a unique party ID, but there are a few instances in NALD where it doesn't
      logger.error(`Error importing CRM invoice address ${row.IAS_CUST_REF}`);
    }
  }
};

const importInvoiceAddresses = async () => {
  try {
    const { rows } = await pool.query(queries.invoiceAccounts.getIASAccounts);
    const arr = deduplicateAddressChanges(rows);
    return insertInvoiceAddresses(arr);
  } catch (err) {
    logger.error(`Error importing CRM invoice addresses`, err);
    throw err;
  }
};

exports.importInvoiceAddresses = importInvoiceAddresses;
