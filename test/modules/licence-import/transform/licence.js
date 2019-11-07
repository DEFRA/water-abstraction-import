const { test, experiment, beforeEach } = exports.lab = require('lab').script();
const { transformLicence } = require('../../../../src/modules/licence-import/transform/licence');
const { expect } = require('code');

const data = require('./data');
const createLicenceData = () => {
  const licence = data.createLicence();
  return {
    licence,
    versions: [
      data.createVersion(licence)
    ],
    chargeVersions: [
      data.createChargeVersion(licence)
    ],
    tptAgreements: [

    ],
    section130Agreements: [

    ],
    parties: [
      data.createParty()
    ],
    addresses: [
      data.createAddress()
    ]
  };
};

experiment('modules/licence-import/transform/licence.js', () => {
  experiment('transformLicence', () => {
    let result;

    experiment('for a simple licence', () => {
      beforeEach(async () => {
        const licenceData = createLicenceData();
        result = transformLicence(licenceData);
      });

      test('the licence should contain licence details', async () => {
        expect(result.licenceNumber).to.equal('01/123');
        expect(result.startDate).to.equal('2016-04-01');
        expect(result.externalId).to.equal('1:123');
        expect(result.endDate).to.equal(null);
      });

      test('a document is created for each issue number', async () => {
        expect(result.documents.length).to.equal(1);
        const [doc] = result.documents;
        expect(doc.documentRef).to.equal('01/123');
        expect(doc.issueNumber).to.equal(100);
        expect(doc.status).to.equal('current');
        expect(doc.startDate).to.equal('2016-04-01');
        expect(doc.endDate).to.equal(null);
        expect(doc.externalId).to.equal('1:123:100:1');
        expect(doc.roles).to.be.an.array();
      });

      test('a document role is created for the licence holder', async () => {
        const [role] = result.documents[0].roles;
        expect(role.role).to.equal('licenceHolder');
        expect(role.startDate).to.equal('2016-04-01');
        expect(role.endDate).to.equal(null);
        expect(role.company.externalId).to.equal('1:1000');
        expect(role.contact).to.equal(null);
        expect(role.address.externalId).to.equal('1:1000');
      });

      test('a document role is created for the billing contact', async () => {
        const [, role] = result.documents[0].roles;
        expect(role.role).to.equal('billing');
        expect(role.startDate).to.equal('2016-04-01');
        expect(role.endDate).to.equal(null);
        expect(role.invoiceAccount.invoiceAccountNumber).to.equal('X1234');
        expect(role.company).to.equal(null);
        expect(role.contact).to.equal(null);
        expect(role.address).to.equal(null);
      });

      test('there are no licence agreements', async () => {
        expect(result.agreements).to.equal([]);
      });
    });
  });
});
