const { test, experiment, beforeEach } = exports.lab = require('@hapi/lab').script();
const { transformLicence } = require('../../../../src/modules/licence-import/transform/licence');
const { expect } = require('@hapi/code');

const data = require('./data');
const createSimpleLicence = () => {
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
    ],
    purposes: [
      data.createPurpose(licence)
    ]
  };
};

const createComplexLicence = () => {
  const licence = data.createLicence();
  return {
    licence,
    versions: [
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }),
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '2', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' }),
      data.createVersion(licence, { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' })
    ],
    purposes: [
      data.createPurpose(licence, { AABV_ISSUE_NO: '1', AABV_INCR_NO: '1', APUR_APPR_CODE: 'A' }),
      data.createPurpose(licence, { AABV_ISSUE_NO: '1', AABV_INCR_NO: '2', APUR_APPR_CODE: 'B' }),
      data.createPurpose(licence, { AABV_ISSUE_NO: '2', AABV_INCR_NO: '1', APUR_APPR_CODE: 'C' }),
      data.createPurpose(licence, { AABV_ISSUE_NO: '2', AABV_INCR_NO: '1', APUR_APPR_CODE: 'D' })
    ],
    chargeVersions: [
      data.createChargeVersion(licence, { VERS_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '14/05/2016', ACON_APAR_ID: '1000' }),
      data.createChargeVersion(licence, { VERS_NO: '2', EFF_ST_DATE: '15/05/2016', ACON_APAR_ID: '1001', IAS_CUST_REF: 'Y7890' })
    ],
    tptAgreements: [
      { AFSA_CODE: 'S127', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' },
      { AFSA_CODE: 'S127', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' },
      { AFSA_CODE: 'S127', EFF_ST_DATE: '01/07/2017', EFF_END_DATE: 'null' }
    ],
    section130Agreements: [
      { AFSA_CODE: 'S130', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }
    ],
    parties: [
      data.createCompany(),
      data.createPerson()
    ],
    addresses: [
      data.createAddress()
    ]
  };
};

experiment('modules/licence-import/transform/licence.js', () => {
  let result;

  experiment('transformLicence', () => {
    experiment('for a simple licence', () => {
      beforeEach(async () => {
        const licenceData = createSimpleLicence();
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
        expect(doc.versionNumber).to.equal(100);
        expect(doc.status).to.equal('current');
        expect(doc.startDate).to.equal('2016-04-01');
        expect(doc.endDate).to.equal(null);
        expect(doc.externalId).to.equal('1:123:100');
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

      test('the licence contains versions data', async () => {
        expect(result.versions.length).to.equal(1);
        expect(result.versions[0].increment).to.equal(1);
        expect(result.versions[0].status).to.equal('current');
      });
    });

    experiment('for a licence with many versions', () => {
      beforeEach(async () => {
        const licenceData = createComplexLicence();
        result = transformLicence(licenceData);
      });

      test('documents are created when an issue number changes, increment changes are merged', async () => {
        expect(result.documents.length).to.equal(2);
        expect(result.documents[0].versionNumber).to.equal(1);
        expect(result.documents[0].startDate).to.equal('2015-04-02');
        expect(result.documents[0].endDate).to.equal('2015-08-12');
        expect(result.documents[1].versionNumber).to.equal(2);
        expect(result.documents[1].startDate).to.equal('2015-08-13');
        expect(result.documents[1].endDate).to.equal(null);
      });

      test('the first document has the correct licence holder role', async () => {
        const [role] = result.documents[0].roles;
        expect(role.role).to.equal('licenceHolder');
        expect(role.startDate).to.equal('2015-04-02');
        expect(role.endDate).to.equal('2015-08-12');
        expect(role.company.externalId).to.equal('1:1000');
        expect(role.contact).to.equal(null);
        expect(role.address.externalId).to.equal('1:1000');
      });

      test('the first document has the correct billing role', async () => {
        const [, role] = result.documents[0].roles;
        expect(role.role).to.equal('billing');
        expect(role.startDate).to.equal('2015-04-02');
        expect(role.endDate).to.equal('2015-08-12');
        expect(role.invoiceAccount.invoiceAccountNumber).to.equal('X1234');
      });

      test('the second document has the correct licence holder role', async () => {
        const [role] = result.documents[1].roles;
        expect(role.role).to.equal('licenceHolder');
        expect(role.startDate).to.equal('2015-08-13');
        expect(role.endDate).to.equal(null);
        expect(role.company.externalId).to.equal('1:1000');
        expect(role.contact).to.equal(null);
        expect(role.address.externalId).to.equal('1:1000');
      });

      test('the second document has the correct first billing role', async () => {
        const [, role] = result.documents[1].roles;
        expect(role.role).to.equal('billing');
        expect(role.startDate).to.equal('2015-08-13');
        expect(role.endDate).to.equal('2016-05-14');
        expect(role.invoiceAccount.invoiceAccountNumber).to.equal('X1234');
      });

      test('the second document has the correct second billing role', async () => {
        const [, , role] = result.documents[1].roles;
        expect(role.role).to.equal('billing');
        expect(role.startDate).to.equal('2016-05-15');
        expect(role.endDate).to.equal(null);
        expect(role.invoiceAccount.invoiceAccountNumber).to.equal('Y7890');
      });

      test('the two part tariff agreements are merged where date ranges are adjacent', async () => {
        expect(result.agreements[0].agreementCode).to.equal('S127');
        expect(result.agreements[0].startDate).to.equal('2015-04-02');
        expect(result.agreements[0].endDate).to.equal('2015-08-12');

        expect(result.agreements[1].agreementCode).to.equal('S127');
        expect(result.agreements[1].startDate).to.equal('2017-07-01');
        expect(result.agreements[1].endDate).to.equal(null);
      });

      test('the S130 agreement is added', async () => {
        expect(result.agreements[2].agreementCode).to.equal('S130');
        expect(result.agreements[2].startDate).to.equal('2015-04-02');
        expect(result.agreements[2].endDate).to.equal('2015-07-05');
      });

      test('the versions contain the purposes', async () => {
        expect(result.versions[0].purposes.length).to.equal(1);
        expect(result.versions[1].purposes.length).to.equal(1);
        expect(result.versions[2].purposes.length).to.equal(2);

        expect(result.versions[0].purposes[0].purposePrimary).to.equal('A');
        expect(result.versions[1].purposes[0].purposePrimary).to.equal('B');
        expect(result.versions[2].purposes[0].purposePrimary).to.equal('C');
        expect(result.versions[2].purposes[1].purposePrimary).to.equal('D');
      });
    });

    experiment('isWaterUndertaker', () => {
      test('is set to false when the AREP_EIUC_CODE does not end with "SWC"', async () => {
        const rawData = createSimpleLicence();
        const transformed = transformLicence(rawData);
        expect(transformed.isWaterUndertaker).to.be.false();
      });
    });
  });
});
