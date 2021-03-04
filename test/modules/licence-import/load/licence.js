'use strict';

const uuid = require('uuid/v4');

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { loadLicence } = require('../../../../src/modules/licence-import/load/licence');
const connectors = require('../../../../src/modules/licence-import/load/connectors');

experiment('modules/licence-import/load/licence', () => {
  const createLicence = () => ({
    versions: [{
      issue: 100,
      increment: 1,
      status: 'current',
      startDate: '2019-01-01',
      endDate: null,
      externalId: '1:100:100:1',
      purposes: [{
        purposePrimary: 'A',
        purposeSecondary: 'ABC',
        purposeUse: '123',
        abstractionPeriodStartDay: 1,
        abstractionPeriodStartMonth: 1,
        abstractionPeriodEndDay: 2,
        abstractionPeriodEndMonth: 2,
        timeLimitedStartDate: null,
        timeLimitedEndDate: null,
        notes: 'testing',
        annualQuantity: 100
      }]
    }],
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
  let licenceId;
  let licenceVersionId;

  beforeEach(async () => {
    await sandbox.stub(connectors, 'createDocumentRole');
    await sandbox.stub(connectors, 'createDocument');
    await sandbox.stub(connectors, 'getLicenceByRef').resolves({
      licence_id: uuid(),
      expired_date: null,
      lapsed_date: null,
      revoked_date: null
    });
    await sandbox.stub(connectors, 'createAgreement');
    await sandbox.stub(connectors, 'flagLicenceForSupplementaryBilling');
    await sandbox.stub(connectors, 'createLicenceVersion').resolves({
      licence_version_id: licenceVersionId = uuid()
    });
    await sandbox.stub(connectors, 'createLicence').resolves({
      licence_id: licenceId = uuid()
    });
    await sandbox.stub(connectors, 'createLicenceVersionPurpose');

    licence = createLicence();
    await loadLicence(licence);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  test('writes the licence,', async () => {
    expect(connectors.createLicence.calledWith(licence)).to.be.true();
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

  test('creates the licence version', async () => {
    const [version, savedLicenceId] = connectors.createLicenceVersion.lastCall.args;

    expect(version.issue).to.equal(100);
    expect(version.increment).to.equal(1);
    expect(version.status).to.equal('current');
    expect(version.startDate).to.equal('2019-01-01');
    expect(version.endDate).to.equal(null);
    expect(version.externalId).to.equal('1:100:100:1');
    expect(savedLicenceId).to.equal(licenceId);
  });

  test('creates the licence version', async () => {
    const [version, savedLicenceId] = connectors.createLicenceVersion.lastCall.args;

    expect(version.issue).to.equal(100);
    expect(version.increment).to.equal(1);
    expect(version.status).to.equal('current');
    expect(version.startDate).to.equal('2019-01-01');
    expect(version.endDate).to.equal(null);
    expect(version.externalId).to.equal('1:100:100:1');
    expect(savedLicenceId).to.equal(licenceId);
  });

  test('creates the licence version purpose', async () => {
    const [purpose, savedId] = connectors.createLicenceVersionPurpose.lastCall.args;

    expect(savedId).to.equal(licenceVersionId);
    expect(purpose.purposePrimary).to.equal('A');
    expect(purpose.purposeSecondary).to.equal('ABC');
    expect(purpose.purposeUse).to.equal('123');
    expect(purpose.abstractionPeriodStartDay).to.equal(1);
    expect(purpose.abstractionPeriodStartMonth).to.equal(1);
    expect(purpose.abstractionPeriodEndDay).to.equal(2);
    expect(purpose.abstractionPeriodEndMonth).to.equal(2);
    expect(purpose.timeLimitedStartDate).to.equal(null);
    expect(purpose.timeLimitedEndDate).to.equal(null);
    expect(purpose.notes).to.equal('testing');
    expect(purpose.annualQuantity).to.equal(100);
  });
});
