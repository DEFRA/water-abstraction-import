'use strict'

const { v4: uuid } = require('uuid')

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const { loadLicence } = require('../../../../src/modules/licence-import/load/licence')
const connectors = require('../../../../src/modules/licence-import/load/connectors')
const config = require('../../../../config')

const createLicence = (expiryDate = null) => ({
  licenceNumber: '123/456',
  expiredDate: expiryDate,
  lapsedDate: null,
  revokedDate: null,
  versions: [{
    issue: 101,
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
      annualQuantity: 100,
      conditions: [{
        code: 'AGG',
        subcode: 'LLL',
        param1: null,
        param2: null,
        notes: null,
        externalId: '123:20'
      }]
    }]
  },
  {
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
      annualQuantity: 100,
      conditions: []
    }]
  }],
  document: {
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
    }, {
      role: 'billing',
      startDate: '2019-01-01',
      endDate: null,
      company: null,
      address: null,
      contact: null,
      invoiceAccount: {
        externalId: '1:100'
      }
    }]
  },
  agreements: [{
    agreementCode: 'S127',
    startDate: '2019-01-01',
    endDate: null
  }]
})

experiment('modules/licence-import/load/licence', () => {
  let licence
  let licenceId
  let licenceVersionId
  let purposeId

  beforeEach(async () => {
    await sandbox.stub(connectors, 'createDocumentRole')
    await sandbox.stub(connectors, 'createDocument')
    await sandbox.stub(connectors, 'getLicenceByRef').resolves({
      licence_id: 'test-licence-id',
      expired_date: null,
      lapsed_date: null,
      revoked_date: null
    })
    await sandbox.stub(connectors, 'createAgreement')
    await sandbox.stub(connectors, 'flagLicenceForSupplementaryBilling')
    await sandbox.stub(connectors, 'createLicenceVersion').resolves({
      licence_version_id: licenceVersionId = uuid()
    })
    await sandbox.stub(connectors, 'createLicence').resolves({
      licence_id: licenceId = uuid()
    })
    await sandbox.stub(connectors, 'createLicenceVersionPurpose').resolves({
      licence_version_purpose_id: purposeId = uuid()
    })
    await sandbox.stub(connectors, 'createPurposeCondition').resolves()
    await sandbox.stub(connectors, 'cleanUpAgreements')

    licence = createLicence()
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('when the flags are enabled in the config', () => {
    beforeEach(async () => {
      sandbox.stub(config.import.licences, 'isBillingDocumentRoleImportEnabled').value(true)
      sandbox.stub(config.import.licences, 'isLicenceAgreementImportEnabled').value(true)

      await loadLicence(licence)
    })

    test('writes the licence,', async () => {
      expect(connectors.createLicence.calledWith(licence)).to.be.true()
    })

    test('creates document', async () => {
      expect(connectors.createDocument.calledWith(
        licence.document
      )).to.be.true()
    })

    test('creates the licence holder document role', async () => {
      expect(connectors.createDocumentRole.calledWith(
        licence.document, licence.document.roles[0]
      )).to.be.true()
    })

    test('creates the billing document role', async () => {
      expect(connectors.createDocumentRole.calledWith(
        licence.document, licence.document.roles[1]
      )).to.be.true()
    })

    test('cleans up old agreements', async () => {
      expect(connectors.cleanUpAgreements.calledWith(
        licence
      )).to.be.true()
    })

    test('creates agreements', async () => {
      expect(connectors.createAgreement.calledWith(
        licence, licence.agreements[0]
      )).to.be.true()
    })

    test('creates the licence version', async () => {
      const [version, savedLicenceId] = connectors.createLicenceVersion.lastCall.args

      expect(version.issue).to.equal(100)
      expect(version.increment).to.equal(1)
      expect(version.status).to.equal('current')
      expect(version.startDate).to.equal('2019-01-01')
      expect(version.endDate).to.equal(null)
      expect(version.externalId).to.equal('1:100:100:1')
      expect(savedLicenceId).to.equal(licenceId)
    })

    test('creates the licence version', async () => {
      const [version, savedLicenceId] = connectors.createLicenceVersion.lastCall.args

      expect(version.issue).to.equal(100)
      expect(version.increment).to.equal(1)
      expect(version.status).to.equal('current')
      expect(version.startDate).to.equal('2019-01-01')
      expect(version.endDate).to.equal(null)
      expect(version.externalId).to.equal('1:100:100:1')
      expect(savedLicenceId).to.equal(licenceId)
    })

    test('creates the licence version purpose', async () => {
      const [purpose, savedId] = connectors.createLicenceVersionPurpose.lastCall.args

      expect(savedId).to.equal(licenceVersionId)
      expect(purpose.purposePrimary).to.equal('A')
      expect(purpose.purposeSecondary).to.equal('ABC')
      expect(purpose.purposeUse).to.equal('123')
      expect(purpose.abstractionPeriodStartDay).to.equal(1)
      expect(purpose.abstractionPeriodStartMonth).to.equal(1)
      expect(purpose.abstractionPeriodEndDay).to.equal(2)
      expect(purpose.abstractionPeriodEndMonth).to.equal(2)
      expect(purpose.timeLimitedStartDate).to.equal(null)
      expect(purpose.timeLimitedEndDate).to.equal(null)
      expect(purpose.notes).to.equal('testing')
      expect(purpose.annualQuantity).to.equal(100)
    })

    test('creates the licence version purpose condition', async () => {
      const [condition, savedId] = connectors.createPurposeCondition.lastCall.args
      expect(savedId).to.equal(purposeId)
      expect(condition.code).to.equal('AGG')
      expect(condition.subcode).to.equal('LLL')
      expect(condition.param1).to.equal(null)
      expect(condition.param2).to.equal(null)
      expect(condition.notes).to.equal(null)
      expect(condition.externalId).to.equal('123:20')
      expect(connectors.createPurposeCondition.callCount).to.equal(1)
    })

    test('attempts to grab the licence record', () => {
      expect(connectors.getLicenceByRef.calledWith(
        '123/456'
      )).to.be.true()
    })

    experiment('when there is no change in licence death', () => {
      beforeEach(async () => {
      })
      test('does not flag the licence for supplementary billing', () => {
        expect(connectors.flagLicenceForSupplementaryBilling.calledWith(
          'test-licence-id'
        )).to.be.false()
      })
    })

    experiment('when there is a difference in licence death', () => {
      beforeEach(async () => {
        licence = createLicence(new Date())
        await loadLicence(licence)
      })
      test('flags the licence for supplementary billing', () => {
        expect(connectors.flagLicenceForSupplementaryBilling.calledWith(
          'test-licence-id'
        )).to.be.true()
      })
    })
  })

  experiment('when the isBillingDocumentRoleImportEnabled flag is disabled in the config', () => {
    beforeEach(async () => {
      sandbox.stub(config.import.licences, 'isBillingDocumentRoleImportEnabled').value(false)
      sandbox.stub(config.import.licences, 'isLicenceAgreementImportEnabled').value(true)

      await loadLicence(licence)
    })

    test('creates the licence holder document role', async () => {
      expect(connectors.createDocumentRole.calledWith(
        licence.document, licence.document.roles[0]
      )).to.be.true()
    })

    test('creates the billing document role', async () => {
      expect(connectors.createDocumentRole.calledWith(
        licence.document, licence.document.roles[1]
      )).to.be.false()
    })
  })

  experiment('when the isInvoiceAccountImportEnabled flag is disabled in the config', () => {
    beforeEach(async () => {
      sandbox.stub(config.import.licences, 'isBillingDocumentRoleImportEnabled').value(true)
      sandbox.stub(config.import.licences, 'isLicenceAgreementImportEnabled').value(false)

      await loadLicence(licence)
    })

    test('does not create agreements', async () => {
      expect(connectors.createAgreement.called).to.be.false()
    })
  })
})
