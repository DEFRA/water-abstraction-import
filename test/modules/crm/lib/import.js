const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const crmImport = require('../../../../src/modules/crm/lib/import');
const { logger } = require('../../../../src/logger');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../../src/lib/connectors/db');

const queries = require('../../../../src/modules/crm/lib/queries/');
const importInvoiceAddresses = require('../../../../src/modules/crm/lib/import-invoice-addresses');
const importDocumentBillingRoles = require('../../../../src/modules/crm/lib/import-document-billing-roles');
const importLicenceHolderRoles = require('../../../../src/modules/crm/lib/import-licence-holder-roles');


experiment('modules/crm-import/controller.js', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    sandbox.stub(pool, 'query');
    sandbox.stub(importInvoiceAddresses, 'importInvoiceAddresses');
    sandbox.stub(importDocumentBillingRoles, 'importDocumentBillingRoles');
    sandbox.stub(importLicenceHolderRoles, 'importLicenceHolderRoles');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importCRMData', () => {
    experiment('when there are no errors', () => {
      beforeEach(async () => {
        await crmImport.importCRMData();
      });

      test('logs info messages', async () => {
        expect(logger.info.callCount).to.equal(5);
      });

      test('does not log error messages', async () => {
        expect(logger.error.callCount).to.equal(0);
      });

      test('runs each query in sequence', async () => {
        expect(pool.query.getCall(0).args[0]).to.equal(queries.documents.importDocumentHeaders);
        expect(pool.query.getCall(1).args[0]).to.equal(queries.companies.importCompanies);
        expect(pool.query.getCall(2).args[0]).to.equal(queries.contacts.importContacts);
        expect(pool.query.getCall(3).args[0]).to.equal(queries.companyContacts.importInvoiceCompanyContacts);
        expect(pool.query.getCall(4).args[0]).to.equal(queries.invoiceAccounts.importInvoiceAccounts);
        expect(pool.query.getCall(5).args[0]).to.equal(queries.addresses.importInvoiceAddresses);
      });
    });

  });
});
