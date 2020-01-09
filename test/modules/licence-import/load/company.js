const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { loadCompany } = require('../../../../src/modules/licence-import/load/company');
const connectors = require('../../../../src/modules/licence-import/load/connectors');

experiment('modules/licence-import/load/company', () => {
  const createCompany = () => ({
    externalId: '1:100',
    addresses: [{
      startDate: '2018-01-15',
      endDate: null,
      address: {
        externalId: '1:1040'
      }
    }],
    invoiceAccounts: [{
      startDate: '2018-02-05',
      endDate: null,
      invoiceAccount: {
        invoiceAccountNumber: 'X1234'
      },
      addresses: [{
        startDate: '2018-01-14',
        endDate: null,
        address: {
          externalId: '1:2056'
        }
      }]
    }],
    contacts: [{
      role: 'licenceHolder',
      startDate: '2018-01-01',
      endDate: null,
      contact: {
        externalId: '1:25'
      }
    }, {
      role: [{
        role: 'billing',
        startDate: '2018-06-06',
        endDate: null,
        contact: {
          externalId: '1:50'
        }
      }]
    }]
  });

  let company;

  beforeEach(async () => {
    sandbox.stub(connectors, 'createCompany');
    sandbox.stub(connectors, 'createAddress');
    sandbox.stub(connectors, 'createContact');
    sandbox.stub(connectors, 'createCompanyAddress');
    sandbox.stub(connectors, 'createCompanyContact');
    sandbox.stub(connectors, 'createInvoiceAccount');
    sandbox.stub(connectors, 'createInvoiceAccountAddress');

    company = createCompany();
    await loadCompany(company);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('creates company', async () => {
    expect(
      connectors.createCompany.calledWith(company)
    ).to.be.true();
  });

  test('creates addresses', async () => {
    expect(
      connectors.createAddress.calledWith(company.addresses[0].address)
    ).to.be.true();
  });

  test('creates company addresses', async () => {
    expect(
      connectors.createCompanyAddress.calledWith(company, company.addresses[0])
    ).to.be.true();
  });

  test('creates invoice account addresses', async () => {
    expect(
      connectors.createAddress.calledWith(company.invoiceAccounts[0].addresses[0].address)
    ).to.be.true();
  });

  test('creates contacts', async () => {
    expect(
      connectors.createContact.calledWith(company.contacts[0].contact)
    ).to.be.true();
  });

  test('creates company contact', async () => {
    expect(
      connectors.createCompanyContact.calledWith(company, company.contacts[0])
    ).to.be.true();
  });

  test('creates invoice account', async () => {
    expect(
      connectors.createInvoiceAccount.calledWith(company, company.invoiceAccounts[0])
    ).to.be.true();
  });

  test('creates invoice account addresses', async () => {
    expect(
      connectors.createInvoiceAccountAddress.calledWith(company.invoiceAccounts[0], company.invoiceAccounts[0].addresses[0])
    ).to.be.true();
  });
});
