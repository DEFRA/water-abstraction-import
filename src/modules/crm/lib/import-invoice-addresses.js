const { groupBy, mapValues, flatMap, last, get, uniqWith, pick } = require('lodash');
const moment = require('moment');
const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries');
const { logger } = require('../../../logger');

const DATE_FORMAT = 'YYYY-MM-DD';

const groupByIASNumber = data => groupBy(data, row => row.IAS_CUST_REF);

const groupByDate = data => groupBy(data, row => row.start_date);

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

const insertInvoiceAddress = row => {
  const query = `
  INSERT INTO crm_v2.invoice_account_addresses
    (invoice_account_id, address_id, start_date, end_date, date_created, date_updated)
  VALUES
    ($1, $2, $3, $4, NOW(), NOW())
  ON CONFLICT (invoice_account_id, start_date) DO UPDATE SET 
    end_date=EXCLUDED.end_date,
    date_updated=EXCLUDED.date_updated`;

  const params = [
    row.invoice_account_id,
    row.address_id,
    row.start_date,
    row.endDate
  ];

  return pool.query(query, params);
};

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
  const { rows } = await pool.query(queries.invoiceAccounts.getIASAccounts);
  const arr = deduplicateAddressChanges(rows);
  return insertInvoiceAddresses(arr);
};

exports.importInvoiceAddresses = importInvoiceAddresses;
