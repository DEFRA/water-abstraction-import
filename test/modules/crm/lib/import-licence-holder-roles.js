const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const { expect } = require('code');
const importLicenceHolderRoles = require('../../../../src/modules/crm/lib/import-licence-holder-roles');
const { logger } = require('../../../../src/logger');
const queries = require('../../../../src/modules/crm/lib/queries');
const { pool } = require('../../../../src/lib/connectors/db');

const data = [
  {
    document_id: 'document_1',
    company_id: 'company_1',
    contact_id: 'contact_1',
    address_id: 'address_1',
    role_id: 'role_1',
    start_date: '2018-01-01',
    end_date: '2018-12-31'
  }, {
    document_id: 'document_1',
    company_id: 'company_1',
    contact_id: 'contact_1',
    address_id: 'address_1',
    role_id: 'role_1',
    start_date: '2019-01-01',
    end_date: '2019-06-31'
  }, {
    document_id: 'document_2',
    company_id: 'company_1',
    contact_id: 'contact_1',
    address_id: 'address_1',
    role_id: 'role_1',
    start_date: '2018-05-01',
    end_date: null
  }
];

experiment('modules/crm/lib/import-licence-holder-roles', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query');
    sandbox.stub(logger, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importLicenceHolderRoles', () => {
    experiment('when there are no errors', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.documents.getLicenceHolderCompanies)
          .resolves({
            rows: data
          });

        await importLicenceHolderRoles.importLicenceHolderRoles();
      });

      test('data is loaded from the database with the correct query', async () => {
        expect(pool.query.firstCall.calledWith(
          queries.documents.getLicenceHolderCompanies
        )).to.be.true();
      });

      test('inserts the licence holder document roles with the correct query', async () => {
        const [query] = pool.query.lastCall.args;
        expect(query).to.equal(queries.documentRoles.insertLicenceHolderRole);
      });

      test('merges rows where the only difference is the date range', async () => {
        const [, params] = pool.query.getCall(1).args;
        expect(params).to.equal([
          'document_1',
          'company_1',
          'contact_1',
          'address_1',
          'role_1',
          '2018-01-01',
          '2019-06-31'
        ]);
      });

      test('inserts the mapped data with the correct params', async () => {
        const [, params] = pool.query.getCall(2).args;
        expect(params).to.equal([
          'document_2',
          'company_1',
          'contact_1',
          'address_1',
          'role_1',
          '2018-05-01',
          null
        ]);
      });
    });

    experiment('when a DB write operation fails', async () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.documents.getLicenceHolderCompanies)
          .resolves({
            rows: data
          });
        pool.query.withArgs(queries.documentRoles.insertLicenceHolderRole).rejects();
        await importLicenceHolderRoles.importLicenceHolderRoles();
      });

      test('errors are logged', async () => {
        expect(logger.error.callCount).to.equal(2);
        const [message] = logger.error.lastCall.args;
        expect(message).to.equal('Error importing CRM licence holder role');
      });
    });
  });
});
