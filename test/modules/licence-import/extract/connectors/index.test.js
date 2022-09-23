const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const queries = require('../../../../../src/modules/licence-import/extract/connectors/queries')
const sandbox = require('sinon').createSandbox()
const { pool } = require('../../../../../src/lib/connectors/db')

const importConnector = require('../../../../../src/modules/licence-import/extract/connectors/index')

const licenceNumber = 'licence_1'
const licenceId = 123
const regionCode = 2
const partyId = 15
const partyIds = [19, 265]
const addressIds = [124, 92]

experiment('modules/licence-import/connectors/import', () => {
  const data = [{
    foo: 'bar'
  }, {
    bar: 'baz'
  }]

  beforeEach(async () => {
    sandbox.stub(pool, 'query').resolves({ rows: data })
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('getLicence', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getLicence(licenceNumber)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getLicence)
      expect(params).to.equal([licenceNumber])
    })

    test('resolves with the first row found', async () => {
      const result = await importConnector.getLicence(licenceNumber)
      expect(result).to.equal(data[0])
    })
  })

  experiment('getLicenceVersions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getLicenceVersions(regionCode, licenceId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getLicenceVersions)
      expect(params).to.equal([regionCode, licenceId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getLicenceVersions(licenceNumber)
      expect(result).to.equal(data)
    })
  })

  experiment('getAllParties', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAllParties()
      const [query] = pool.query.lastCall.args
      expect(query).to.equal(queries.getAllParties)
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAllParties()
      expect(result).to.equal(data)
    })
  })

  experiment('getAllAddresses', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAllAddresses()
      const [query] = pool.query.lastCall.args
      expect(query).to.equal(queries.getAllAddresses)
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAllAddresses()
      expect(result).to.equal(data)
    })
  })

  experiment('getChargeVersions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getChargeVersions(regionCode, licenceId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getChargeVersions)
      expect(params).to.equal([regionCode, licenceId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getChargeVersions(regionCode, licenceId)
      expect(result).to.equal(data)
    })
  })

  experiment('getTwoPartTariffAgreements', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getTwoPartTariffAgreements(regionCode, licenceId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getTwoPartTariffAgreements)
      expect(params).to.equal([regionCode, licenceId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getTwoPartTariffAgreements(regionCode, licenceId)
      expect(result).to.equal(data)
    })
  })

  experiment('getSection130Agreements', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getSection130Agreements(regionCode, licenceId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getSection130Agreements)
      expect(params).to.equal([regionCode, licenceId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getSection130Agreements(regionCode, licenceId)
      expect(result).to.equal(data)
    })
  })

  experiment('getInvoiceAccounts', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getInvoiceAccounts(regionCode, partyId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getInvoiceAccounts)
      expect(params).to.equal([regionCode, partyId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getInvoiceAccounts(regionCode, partyId)
      expect(result).to.equal(data)
    })
  })

  experiment('getPartyLicenceVersions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getPartyLicenceVersions(regionCode, partyId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getPartyLicenceVersions)
      expect(params).to.equal([regionCode, partyId])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getPartyLicenceVersions(regionCode, partyId)
      expect(result).to.equal(data)
    })
  })

  experiment('getParties', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getParties(regionCode, partyIds)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getParties)
      expect(params).to.equal([regionCode, '19,265'])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getParties(regionCode, partyIds)
      expect(result).to.equal(data)
    })
  })

  experiment('getAddresses', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAddresses(regionCode, addressIds)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getAddresses)
      expect(params).to.equal([regionCode, '124,92'])
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAddresses(regionCode, addressIds)
      expect(result).to.equal(data)
    })
  })

  experiment('getAllLicenceNumbers', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAllLicenceNumbers()
      const [query] = pool.query.lastCall.args
      expect(query).to.equal(queries.getAllLicenceNumbers)
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAllLicenceNumbers(regionCode)
      expect(result).to.equal(data)
    })
  })

  experiment('getParty', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getParty(regionCode, partyId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getParty)
      expect(params).to.equal([regionCode, partyId])
    })

    test('resolves with the first row found', async () => {
      const result = await importConnector.getParty(regionCode, partyId)
      expect(result).to.equal(data[0])
    })
  })

  experiment('getLicenceRoles', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getLicenceRoles(regionCode, licenceId)
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal(queries.getLicenceRoles)
      expect(params).to.equal([regionCode, licenceId])
    })
  })

  experiment('getPurposeConditions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getPurposeConditions()
      const [query] = pool.query.lastCall.args
      expect(query).to.equal(queries.getPurposeConditions)
    })

    test('resolves with all rows found', async () => {
      const result = await importConnector.getPurposeConditions()
      expect(result).to.equal(data)
    })
  })
})
