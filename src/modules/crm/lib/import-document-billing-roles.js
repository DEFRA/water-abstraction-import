const { groupBy, mapValues, flatMap } = require('lodash');
const moment = require('moment');
const { pool } = require('../../../lib/connectors/db');
const { logger } = require('../../../logger');

const queries = require('./queries');
const DATE_FORMAT = 'YYYY-MM-DD';

const groupByDocumentId = data => groupBy(data, row => row.document_id);

const shouldAddRow = (acc, row) => {
  if (acc.length === 0) {
    return true;
  }
  return row.invoice_account_id !== acc[acc.length - 1].invoiceAccountId;
};

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
  const query = `
    INSERT INTO crm_v2.document_roles
      (document_id, company_id, invoice_account_id, role_id, start_date, end_date, date_created, date_updated)
    VALUES
      ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (document_id, company_id, invoice_account_id, role_id, start_date) DO UPDATE SET 
      end_date=EXCLUDED.end_date,
      date_updated=EXCLUDED.date_updated`;

  const params = [
    row.documentId,
    row.companyId,
    row.invoiceAccountId,
    row.roleId,
    row.startDate,
    row.endDate
  ];

  return pool.query(query, params);
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
  const mapped = mapValues(groups, arr => arr.reduce((acc, row) => {
    if (shouldAddRow(acc, row)) {
      acc.push(mapRow(row));
    } else if (row.cv_end_date) {
      acc[acc.length - 1].endDate = row.cv_end_date;
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

exports.importDocumentBillingRoles = importDocumentBillingRoles;
