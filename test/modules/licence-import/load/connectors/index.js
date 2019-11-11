const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const sandbox = require('sinon').createSandbox();

const { pool } = require('../../../../../src/lib/connectors/db');
const queries = require('../../../../../src/modules/licence-import/load/connectors/queries');
const connectors = require('../../../../../src/modules/licence-import/load/connectors');

const data = {
  licence: {
    licenceNumber: '01/123'
  },
  agreement: {
    agreementCode: 'S127',
    startDate: '2019-06-03',
    endDate: null
  },
  document: {
    documentRef: '01/123',
    versionNumber: 2,
    status: 'current',
    startDate: '2019-08-01',
    endDate: '2019-10-04',
    externalId: '1:10'
  },
  licenceHolderRole: {
    role: 'licenceHolder',
    startDate: '2019-08-01',
    endDate: '2019-10-04',
    company: {
      externalId: '1:100'
    },
    contact: {
      externalId: '1:101'
    },
    address: {
      externalId: '1:102'
    },
    invoiceAccount: null
  },
  billingRole: {
    role: 'billing',
    startDate: '2019-08-01',
    endDate: '2019-10-04',
    company: null,
    contact: null,
    address: null,
    invoiceAccount: {
      invoiceAccountNumber: 'X1234'
    }
  },
  company: {
    name: 'BIG CO LTD',
    type: 'organisation',
    externalId: '1:100'
  },
  address: {
    address1: 'SUNNY FARM',
    address2: 'BUTTERCUP LANE',
    address3: 'BLUEBELL WOODS',
    address4: 'DAISY HILL',
    town: 'TESTINGTON',
    county: 'TESTINGSHIRE',
    postcode: 'TT1 1TT',
    country: 'ENGLAND',
    externalId: '1:1005'
  },
  contact: {
    salutation: 'SIR',
    firstName: 'JOHN',
    lastName: 'DOE',
    externalId: '1:2040'
  },
  invoiceAccount: {
    invoiceAccountNumber: 'X1234',
    startDate: '2019-01-01',
    endDate: '2019-12-31'
  },
  invoiceAccountAddress: {
    startDate: '2019-01-01',
    endDate: '2019-12-31',
    address: {
      address1: 'SUNNY FARM',
      address2: 'BUTTERCUP LANE',
      address3: 'BLUEBELL WOODS',
      address4: 'DAISY HILL',
      town: 'TESTINGTON',
      county: 'TESTINGSHIRE',
      postcode: 'TT1 1TT',
      country: 'ENGLAND',
      externalId: '1:1005'
    }
  },
  companyContact: {
    startDate: '2019-04-02',
    endDate: '2020-01-01',
    role: 'licenceHolder',
    contact: {
      salutation: 'SIR',
      firstName: 'JOHN',
      lastName: 'DOE',
      externalId: '1:2040'
    }
  },
  companyAddress: {
    startDate: '2019-04-02',
    endDate: '2020-01-01',
    role: 'licenceHolder',
    address: {
      address1: 'SUNNY FARM',
      address2: 'BUTTERCUP LANE',
      address3: 'BLUEBELL WOODS',
      address4: 'DAISY HILL',
      town: 'TESTINGTON',
      county: 'TESTINGSHIRE',
      postcode: 'TT1 1TT',
      country: 'ENGLAND',
      externalId: '1:1005'
    }
  }
};

experiment('modules/licence-import/load/connectors', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query').resolves();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('createDocument', () => {
    beforeEach(async () => {
      await connectors.createDocument(data.document);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createDocument);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.document.documentRef,
        data.document.versionNumber,
        data.document.status,
        data.document.startDate,
        data.document.endDate,
        data.document.externalId
      ]);
    });
  });

  experiment('createDocumentRole for licence holder', () => {
    beforeEach(async () => {
      await connectors.createDocumentRole(data.document, data.licenceHolderRole);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createDocumentRole);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.document.documentRef,
        data.document.versionNumber,
        data.licenceHolderRole.role,
        data.licenceHolderRole.company.externalId,
        data.licenceHolderRole.contact.externalId,
        data.licenceHolderRole.address.externalId,
        null,
        data.licenceHolderRole.startDate,
        data.licenceHolderRole.endDate
      ]);
    });
  });

  experiment('createDocumentRole for billing', () => {
    beforeEach(async () => {
      await connectors.createDocumentRole(data.document, data.billingRole);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createDocumentRole);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.document.documentRef,
        data.document.versionNumber,
        data.billingRole.role,
        null,
        null,
        null,
        data.billingRole.invoiceAccount.invoiceAccountNumber,
        data.billingRole.startDate,
        data.billingRole.endDate
      ]);
    });
  });

  experiment('createCompany', () => {
    beforeEach(async () => {
      await connectors.createCompany(data.company);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createCompany);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.company.name,
        data.company.type,
        data.company.externalId
      ]);
    });
  });

  experiment('createAddress', () => {
    beforeEach(async () => {
      await connectors.createAddress(data.address);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createAddress);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.address.address1,
        data.address.address2,
        data.address.address3,
        data.address.address4,
        data.address.town,
        data.address.county,
        data.address.postcode,
        data.address.country,
        data.address.externalId
      ]);
    });
  });

  experiment('createContact', () => {
    beforeEach(async () => {
      await connectors.createContact(data.contact);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createContact);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.contact.salutation,
        data.contact.firstName,
        data.contact.lastName,
        data.contact.externalId
      ]);
    });
  });

  experiment('createInvoiceAccount', () => {
    beforeEach(async () => {
      await connectors.createInvoiceAccount(data.company, data.invoiceAccount);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createInvoiceAccount);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.invoiceAccount.invoiceAccountNumber,
        data.invoiceAccount.startDate,
        data.invoiceAccount.endDate,
        data.company.externalId
      ]);
    });
  });

  experiment('createInvoiceAccountAddress', () => {
    beforeEach(async () => {
      await connectors.createInvoiceAccountAddress(data.invoiceAccount, data.invoiceAccountAddress);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createInvoiceAccountAddress);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.invoiceAccount.invoiceAccountNumber,
        data.invoiceAccountAddress.address.externalId,
        data.invoiceAccountAddress.startDate,
        data.invoiceAccountAddress.endDate
      ]);
    });
  });

  experiment('createCompanyContact', () => {
    beforeEach(async () => {
      await connectors.createCompanyContact(data.company, data.companyContact);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createCompanyContact);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.company.externalId,
        data.companyContact.contact.externalId,
        data.companyContact.role,
        data.companyContact.startDate,
        data.companyContact.endDate
      ]);
    });
  });

  experiment('createCompanyAddress', () => {
    beforeEach(async () => {
      await connectors.createCompanyAddress(data.company, data.companyAddress);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createCompanyAddress);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.company.externalId,
        data.companyAddress.address.externalId,
        data.companyAddress.role,
        data.companyAddress.startDate,
        data.companyAddress.endDate
      ]);
    });
  });

  experiment('createAgreement', () => {
    beforeEach(async () => {
      await connectors.createAgreement(data.licence, data.agreement);
    });

    test('uses the correct query', async () => {
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.createAgreement);
    });

    test('uses the correct params', async () => {
      const [, params] = pool.query.lastCall.args;
      expect(params).to.equal([
        data.licence.licenceNumber,
        data.agreement.agreementCode,
        data.agreement.startDate,
        data.agreement.endDate
      ]);
    });
  });
});
