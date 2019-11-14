const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const sandbox = require('sinon').createSandbox();

const { loadLicence } = require('../../../../src/modules/licence-import/load/licence');
const connectors = require('../../../../src/modules/licence-import/load/connectors');

experiment('modules/licence-import/load/licence', () => {
  const createLicence = () => ({
    documents: [{
      documentRef: '123/456',
      startDate: '2019-01-01',
      versionNumber: 1,
      roles: [{
        role: 'licenceHolder',
        startDate: '2019-01-01',
        endDate: null,
        company: {
          externalId: '1:100'
        },
        address: {
          externalId: '1:101'
        },
        contact: {
          externalId: '1:100'
        },
        invoiceAccount: null
      }]
    }],
    agreements: [{
      agreementCode: 'S127',
      startDate: '2019-01-01',
      endDate: null
    }]
  });

  let licence;

  beforeEach(async () => {
    sandbox.stub(connectors, 'createDocumentRole');
    sandbox.stub(connectors, 'createDocument');
    sandbox.stub(connectors, 'createAgreement');

    licence = createLicence();
    await loadLicence(licence);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('creates document', async () => {
    expect(connectors.createDocument.calledWith(
      licence.documents[0]
    )).to.be.true();
  });

  test('creates document roles', async () => {
    expect(connectors.createDocumentRole.calledWith(
      licence.documents[0], licence.documents[0].roles[0]
    )).to.be.true();
  });

  test('creates agreements', async () => {
    expect(connectors.createAgreement.calledWith(
      licence, licence.agreements[0]
    )).to.be.true();
  });
});
