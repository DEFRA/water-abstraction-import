const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const { importLicence, getContext, importCompany } = require('../../../src/modules/licence-import/index');
const sandbox = require('sinon').createSandbox();
const data = require('./data');

const importConnector = require('../../../src/modules/licence-import/connectors/import');

experiment('modules/licence-import/index.js', () => {
  let context;

  beforeEach(async () => {
    sandbox.stub(importConnector, 'getLicence');
    sandbox.stub(importConnector, 'getLicenceVersions');
    sandbox.stub(importConnector, 'getTwoPartTariffAgreements').resolves([]);
    sandbox.stub(importConnector, 'getSection130Agreements').resolves([]);
    sandbox.stub(importConnector, 'getChargeVersions').resolves([]);

    sandbox.stub(importConnector, 'getAllParties').resolves([
      data.createCompany(),
      data.createPerson()
    ]);
    sandbox.stub(importConnector, 'getAllAddresses').resolves([
      data.createAddress(),
      data.createAddress({ ID: '1001', 'ADDR_LINE1': 'THE NEW FARMHOUSE' })
    ]);

    context = await getContext();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('getContext', async () => {
    experiment('for NALD organisations', () => {
      test('the contact is null', async () => {
        const { contact } = context.parties['1']['1000'];
        expect(contact).to.be.null();
      });
      test('the company is mapped correctly', async () => {
        const { company, contact } = context.parties['1']['1000'];
        expect(contact).to.be.null();
        expect(company.type).to.equal('organisation');
        expect(company.name).to.equal('BIG CO LTD');
        expect(company.externalId).to.equal('1:1000');
        expect(company._nald).to.equal(data.createCompany());
      });
    });

    experiment('for NALD people', () => {
      test('the contact is mapped correctly', async () => {
        const { contact } = context.parties['1']['1001'];
        expect(contact.salutation).to.equal('SIR');
        expect(contact.firstName).to.equal('JOHN');
        expect(contact.lastName).to.equal('DOE');
        expect(contact.externalId).to.equal('1:1001');
      });

      test('the company is mapped correctly', async () => {
        const { company } = context.parties['1']['1001'];
        expect(company.type).to.equal('person');
        expect(company.name).to.equal('SIR JOHN DOE');
        expect(company.externalId).to.equal('1:1001');
        expect(company._nald).to.equal(data.createPerson());
      });
    });
  });

  experiment('importLicence', () => {
    experiment('when there is a single licence version', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence();
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence)
        ]);
        result = await importLicence('01/123', context);
      });

      test('the licence is mapped correctly', async () => {
        expect(result.licenceNumber).to.equal('01/123');
        expect(result.externalId).to.equal('1:123');
        expect(result.startDate).to.equal('2016-04-01');
        expect(result.endDate).to.equal(null);
      });

      test('there is single document that is mapped correctly', async () => {
        expect(result.documents.length).to.equal(1);
        const [doc] = result.documents;
        expect(doc.issueNumber).to.equal(100);
        expect(doc.status).to.equal('current');
        expect(doc.startDate).to.equal('2016-04-01');
        expect(doc.endDate).to.equal(null);
        expect(doc.externalId).to.equal('1:123:100:1');
      });

      test('there is a single licence role that is mapped correctly', async () => {
        expect(result.documents[0].roles.length).to.equal(1);
        const [role] = result.documents[0].roles;
        expect(role.role).to.equal('licenceHolder');
        expect(role.startDate).to.equal('2016-04-01');
        expect(role.endDate).to.equal(null);
        expect(role.company.externalId).to.equal('1:1000');
        expect(role.contact).to.equal(null);
        expect(role.address.externalId).to.equal('1:1000');
      });

      test('there are no agreements', async () => {
        expect(result.agreements.length).to.equal(0);
      });
    });

    experiment('when a licence has a revoked/lapsed/expired date', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence({
          EXPIRY_DATE: '15/04/2018',
          LAPSED_DATE: '14/04/2018',
          REV_DATE: '13/04/2018'
        });
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence)
        ]);
        result = await importLicence('01/123', context);
      });

      test('the licence end date is the earliest of the dates', async () => {
        expect(result.endDate).to.equal('2018-04-13');
      });
    });

    experiment('when there are multiple licence versions', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence();
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence, {
            EFF_ST_DATE: '01/04/2016',
            EFF_END_DATE: '25/12/2016',
            ISSUE_NO: '100',
            INCR_NO: '1'
          }),
          data.createVersion(licence, {
            EFF_ST_DATE: '26/12/2016',
            EFF_END_DATE: '04/07/2017',
            ISSUE_NO: '100',
            INCR_NO: '2'
          }),
          data.createVersion(licence, {
            EFF_ST_DATE: '05/07/2017',
            EFF_END_DATE: null,
            ISSUE_NO: '101',
            INCR_NO: '1'
          })
        ]);
        result = await importLicence('01/123', context);
      });

      test('each licence issue number maps to a new document', async () => {
        expect(result.documents.length).to.equal(2);
      });

      test('the first document is merged from both increments within the issue', async () => {
        const [doc] = result.documents;
        expect(doc.startDate).to.equal('2016-04-01');
        expect(doc.endDate).to.equal('2017-07-04');
        expect(doc.externalId).to.equal('1:123:100:2');
        expect(doc.issueNumber).to.equal(100);
      });

      test('the licence holder role for the first document is merged from both increments within the issue', async () => {
        const { roles } = result.documents[0];
        expect(roles.length).to.equal(1);
        expect(roles[0].startDate).to.equal('2016-04-01');
        expect(roles[0].endDate).to.equal('2017-07-04');
        expect(roles[0].company.externalId).to.equal('1:1000');
        expect(roles[0].contact).to.equal(null);
        expect(roles[0].address.externalId).to.equal('1:1000');
      });

      test('the second document is mapped correctly', async () => {
        const [, doc] = result.documents;
        expect(doc.startDate).to.equal('2017-07-05');
        expect(doc.endDate).to.equal(null);
        expect(doc.externalId).to.equal('1:123:101:1');
        expect(doc.issueNumber).to.equal(101);
      });

      test('the licence holder role for the second document is mapped correctly', async () => {
        const { roles } = result.documents[1];
        expect(roles.length).to.equal(1);
        expect(roles[0].startDate).to.equal('2017-07-05');
        expect(roles[0].endDate).to.equal(null);
        expect(roles[0].company.externalId).to.equal('1:1000');
        expect(roles[0].contact).to.equal(null);
        expect(roles[0].address.externalId).to.equal('1:1000');
      });
    });

    experiment('when a licence has charge versions', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence();
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getChargeVersions.resolves([{
          EFF_ST_DATE: '01/04/2016',
          EFF_END_DATE: '31/10/2016',
          IAS_CUST_REF: 'invoice_account_1'
        }, {
          EFF_ST_DATE: '01/11/2016',
          EFF_END_DATE: 'null',
          IAS_CUST_REF: 'invoice_account_2'
        }]);
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence, {
            EFF_ST_DATE: '01/04/2016',
            EFF_END_DATE: '25/12/2016',
            ISSUE_NO: '100',
            INCR_NO: '1'
          }),
          data.createVersion(licence, {
            EFF_ST_DATE: '26/12/2016',
            EFF_END_DATE: null,
            ISSUE_NO: '101',
            INCR_NO: '1'
          })
        ]);
        result = await importLicence('01/123', context);
      });

      test('there are 2 billing roles over the time range of the first document', async () => {
        const roles = result.documents[0].roles.filter(role => role.role === 'billing');
        expect(roles.length).to.equal(2);
        expect(roles[0].startDate).to.equal('2016-04-01');
        expect(roles[0].endDate).to.equal('2016-10-31');
        expect(roles[0].invoiceAccount.invoiceAccountNumber).to.equal('invoice_account_1');

        expect(roles[1].startDate).to.equal('2016-11-01');
        expect(roles[1].endDate).to.equal('2016-12-25');
        expect(roles[1].invoiceAccount.invoiceAccountNumber).to.equal('invoice_account_2');
      });

      test('there is 1 billing role over the time range of the second document', async () => {
        const roles = result.documents[1].roles.filter(role => role.role === 'billing');
        expect(roles.length).to.equal(1);
        expect(roles[0].startDate).to.equal('2016-12-26');
        expect(roles[0].endDate).to.equal(null);
        expect(roles[0].invoiceAccount.invoiceAccountNumber).to.equal('invoice_account_2');
      });
    });

    experiment('when a licence has a section 130 agreement', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence();
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence)
        ]);
        importConnector.getSection130Agreements.resolves([
          data.createAgreement(),
          data.createAgreement({
            EFF_ST_DATE: '15/02/2018',
            EFF_END_DATE: 'null'
          }),
          data.createAgreement({
            AFSA_CODE: 'S130T'
          })
        ]);
        result = await importLicence('01/123', context);
      });

      test('agreements with the same code are merged if their date ranges are adjacent', async () => {
        const agreements = result.agreements.filter(agreement => agreement.agreementCode === 'S130U');
        expect(agreements.length).to.equal(1);
        expect(agreements[0].startDate).to.equal('2017-02-14');
        expect(agreements[0].endDate).to.equal(null);
      });

      test('agreements are not merged if they have a different code', async () => {
        const agreements = result.agreements.filter(agreement => agreement.agreementCode === 'S130T');
        expect(agreements.length).to.equal(1);
        expect(agreements[0].startDate).to.equal('2017-02-14');
        expect(agreements[0].endDate).to.equal('2018-02-14');
      });
    });

    experiment('when a licence charge element has a section 127 agreement', async () => {
      let result, licence;

      beforeEach(async () => {
        licence = data.createLicence();
        importConnector.getLicence.resolves(
          licence
        );
        importConnector.getLicenceVersions.resolves([
          data.createVersion(licence)
        ]);
        importConnector.getTwoPartTariffAgreements.resolves([
          data.createAgreement({
            AFSA_CODE: 'S127'
          }),
          data.createAgreement({
            AFSA_CODE: 'S127',
            EFF_ST_DATE: '15/02/2018',
            EFF_END_DATE: 'null'
          })
        ]);
        result = await importLicence('01/123', context);
      });

      test('agreements are merged if their date ranges are adjacent', async () => {
        const { agreements } = result;
        expect(agreements.length).to.equal(1);
        expect(agreements[0].startDate).to.equal('2017-02-14');
        expect(agreements[0].endDate).to.equal(null);
      });
    });
  });

  experiment('importCompany', () => {
    beforeEach(async () => {
      const licence = data.createLicence();
      sandbox.stub(importConnector, 'getPartyLicenceVersions').resolves([
        data.createVersion(licence),
        data.createVersion(licence, { AABL_ID: '10000', EFF_ST_DATE: '05/02/2014', ACON_AADD_ID: '1001', EFF_END_DATE: '02/09/2015' }),
        data.createVersion(licence, { AABL_ID: '10000', EFF_ST_DATE: '03/09/2014', ACON_AADD_ID: '1001', REV_DATE: '01/07/2016' })
      ]);
    });

    experiment('for an organisation', () => {
      let result;

      beforeEach(async () => {
        result = await importCompany(1, 1000, context);
      });

      test('company data is copied from the context passed in', async () => {
        expect(result.type).to.equal('organisation');
        expect(result.externalId).to.equal('1:1000');
        expect(result.name).to.equal('BIG CO LTD');
      });

      test('the contacts array is empty', async () => {
        expect(result.contacts).to.equal([]);
      });
    });

    experiment('for a person', () => {
      let result;

      beforeEach(async () => {
        result = await importCompany(1, 1001, context);
      });

      test('company data is copied from the context passed in', async () => {
        expect(result.type).to.equal('person');
        expect(result.externalId).to.equal('1:1001');
        expect(result.name).to.equal('SIR JOHN DOE');
      });

      test('a contact is created for the person in the company', async () => {
        expect(result.contacts.length).to.equal(1);
        const [{ contact }] = result.contacts;
        expect(contact.salutation).to.equal('SIR');
        expect(contact.firstName).to.equal('JOHN');
        expect(contact.lastName).to.equal('DOE');
        expect(contact.externalId).to.equal('1:1001');
      });

      test('the start date of the contact is the earliest start date of a non-draft licence version', async () => {
        const [{ startDate }] = result.contacts;
        expect(startDate).to.equal('2014-02-05');
      });

      test('the end date of the contact is null', async () => {
        const [{ endDate }] = result.contacts;
        expect(endDate).to.equal(null);
      });

      test('addresses are imported matching a licence versions', async () => {
        expect(result.addresses.length).to.equal(2);
        const [address] = result.addresses;
        expect(address.startDate).to.equal('2016-04-01');
        expect(address.endDate).to.equal(null);
        expect(address.address.externalId).to.equal('1:1000');
      });

      test('address date ranges are merged for multiple licence versions', async () => {
        expect(result.addresses.length).to.equal(2);
        const [, address] = result.addresses;
        expect(address.startDate).to.equal('2014-02-05');
        expect(address.endDate).to.equal('2016-07-01');
        expect(address.address.externalId).to.equal('1:1001');
      });
    });
  });
});
