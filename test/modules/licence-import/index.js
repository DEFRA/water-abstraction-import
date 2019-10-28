const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const { importLicence, getContext } = require('../../../src/modules/licence-import/index');
const sandbox = require('sinon').createSandbox();
const data = require('./data');

const importConnector = require('../../../src/modules/licence-import/connectors/import');

experiment('modules/licence-import/index.js', () => {
  let context;

  beforeEach(async () => {
    sandbox.stub(importConnector, 'getLicence');
    sandbox.stub(importConnector, 'getLicenceVersions');
    sandbox.stub(importConnector, 'getAllParties').resolves([
      data.createCompany(),
      data.createPerson()
    ]);
    sandbox.stub(importConnector, 'getAllAddresses').resolves([
      data.createAddress()
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
  });
});
