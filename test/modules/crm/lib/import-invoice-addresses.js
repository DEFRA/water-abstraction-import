const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const { expect, fail } = require('code');
const importInvoiceAddresses = require('../../../../src/modules/crm/lib/import-invoice-addresses');
const { logger } = require('../../../../src/logger');
const queries = require('../../../../src/modules/crm/lib/queries/');
const { pool } = require('../../../../src/lib/connectors/db');

const data = [{
  IAS_CUST_REF: 'ias_number_1',
  ACON_AADD_ID: 'address_1',
  start_date: '2015-04-04',
  invoice_account_id: 'invoice_account_1',
  address_id: 'address_1'
}, {
  IAS_CUST_REF: 'ias_number_1',
  ACON_AADD_ID: 'address_1',
  start_date: '2016-05-05',
  invoice_account_id: 'invoice_account_1',
  address_id: 'address_1'
}, {
  IAS_CUST_REF: 'ias_number_1',
  ACON_AADD_ID: 'address_2',
  start_date: '2017-06-06',
  invoice_account_id: 'invoice_account_1',
  address_id: 'address_2'
}, {
  IAS_CUST_REF: 'ias_number_2',
  ACON_AADD_ID: 'address_2',
  start_date: '2015-08-01',
  invoice_account_id: 'invoice_account_2',
  address_id: 'address_2'
}];

experiment('modules/crm/lib/import-invoice-addresses', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query');
    sandbox.stub(logger, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importInvoiceAddresses', () => {
    experiment('when there are no errors', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.invoiceAccounts.getIASAccounts)
          .resolves({
            rows: data
          });
        await importInvoiceAddresses.importInvoiceAddresses();
      });

      test('gets invoice address list from DB', async () => {
        expect(pool.query.firstCall.calledWith(
          queries.invoiceAccounts.getIASAccounts
        )).to.equal(true);
      });

      test('uses the correct query to insert invoice account address records', async () => {
        const [query] = pool.query.getCall(1).args;
        expect(query).to.equal(queries.invoiceAccountAddresses.insertInvoiceAccountAddress);
      });

      test('merges adjacent rows with the same address, setting end date to day before next row', async () => {
        const [, data] = pool.query.getCall(1).args;
        expect(data).to.equal([
          'invoice_account_1',
          'address_1',
          '2015-04-04',
          '2017-06-05'
        ]);
      });

      test('does not set end date on last address change', async () => {
        const [, data] = pool.query.getCall(2).args;
        expect(data).to.equal([
          'invoice_account_1',
          'address_2',
          '2017-06-06',
          null
        ]);
      });

      test('creates a new record for each new invoice account', async () => {
        const [, data] = pool.query.getCall(3).args;
        expect(data).to.equal([
          'invoice_account_2',
          'address_2',
          '2015-08-01',
          null
        ]);
      });
    });

    experiment('when a the DB read operation fails', async () => {
      beforeEach(async () => {
        pool.query.rejects();
      });

      test('an error is logged', async () => {
        try {
          await importInvoiceAddresses.importInvoiceAddresses();
          fail();
        } catch (err) {
          expect(logger.error.callCount).to.equal(1);
          const [message] = logger.error.lastCall.args;
          expect(message).to.equal('Error importing CRM invoice addresses');
        }
      });
    });

    experiment('when a DB write operation fails', async () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.invoiceAccounts.getIASAccounts)
          .resolves({
            rows: data
          });
        pool.query.onCall(1).rejects();
        await importInvoiceAddresses.importInvoiceAddresses();
      });

      test('an error is logged', async () => {
        expect(logger.error.callCount).to.equal(1);
        const [message] = logger.error.lastCall.args;
        expect(message).to.equal('Error importing CRM invoice address ias_number_1');
      });
    });
  });
});
