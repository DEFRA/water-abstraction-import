const { groupBy, mapValues, flatMap, last } = require('lodash');
const moment = require('moment');
const { pool } = require('../../../lib/connectors/db');
const { logger } = require('../../../logger');

const queries = require('./queries');
const DATE_FORMAT = 'YYYY-MM-DD';

const groupByDocumentId = data => groupBy(data, row => row.document_id);

const isInvoiceAccountMatch = (acc, row) =>
  row.invoice_account_id === last(acc).invoiceAccountId;

const shouldAddRow = (acc, row) =>
  (acc.length === 0) || !isInvoiceAccountMatch(acc, row);

const shouldUpdateRow = (acc, row) =>
  (acc.length > 0) && isInvoiceAccountMatch(acc, row);

const getStartDate = row => {
  const timestamps = [row.start_date, row.cv_start_date].map(str => moment(str).unix());
  const max = Math.max(...timestamps);
  return moment.unix(max).format(DATE_FORMAT);
};

const mapRow = row => ({
  documentId: row.document_id,
  companyId: row.company_id,
  invoiceAccountId: row.invoice_account_id,
  roleId: row.role_id,
  startDate: getStartDate(row),
  endDate: row.cv_end_date
});

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
