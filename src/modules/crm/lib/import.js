const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries/');
const { logger } = require('../../../logger');
const importInvoiceAddresses = require('./import-invoice-addresses');
const importDocumentBillingRoles = require('./import-document-billing-roles');

/**
 * Run SQL queries to import charge versions / elements into
 * water service tables from NALD import tables
 * @return {Promise}
 */
const importCRMData = async () => {
  logger.info(`Starting CRM data import`);

  const arr = [
    queries.documents.importDocumentHeaders,
    queries.companies.importInvoiceCompanies,
    queries.contacts.importInvoiceContacts,
    queries.companyContacts.importInvoiceCompanyContacts,
    queries.invoiceAccounts.importInvoiceAccounts,
    queries.addresses.importInvoiceAddresses
  ];

  for (const query of arr) {
    await pool.query(query);
  }

  logger.info(`CRM data: import billing roles`);
  await importDocumentBillingRoles.importDocumentBillingRoles();
  logger.info(`CRM data: import invoice account addresses`);
  await importInvoiceAddresses.importInvoiceAddresses();

  logger.info(`CRM data imported`);
};

exports.importCRMData = importCRMData;
