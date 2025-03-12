'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const returnHelpers = require('../../../../src/modules/return-logs/lib/return-helpers.js')
const cache = require('../../../../src/modules/return-logs/lib/cache.js')
const db = require('../../../../src/lib/connectors/db.js')
const queries = require('../../../../src/modules/return-logs/lib/queries.js')

experiment('modules/return-logs/lib/return-helpers', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'query')
    sandbox.stub(cache, 'createCachedQuery')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getFormats', () => {
    beforeEach(async () => {
      await returnHelpers.getFormats('test-lic')
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getFormats)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal(['test-lic'])
    })
  })

  experiment('.getFormatPurposes', () => {
    beforeEach(async () => {
      await returnHelpers.getFormatPurposes('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getFormatPurposes)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal(['test-format', 'test-region'])
    })
  })

  experiment('.getFormatPoints', () => {
    beforeEach(async () => {
      await returnHelpers.getFormatPoints('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getFormatPoints)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal(['test-format', 'test-region'])
    })
  })

  experiment('.getLogs', () => {
    beforeEach(async () => {
      await returnHelpers.getLogs('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getLogs)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal(['test-format', 'test-region'])
    })
  })

  experiment('.getLines', () => {
    let formatId
    let regionCode
    let dateFrom
    let dateTo

    beforeEach(async () => {
      formatId = 'test-format-id'
      regionCode = 'test-region-code'
      dateFrom = 'test-date-from'
      dateTo = 'test-date-to'
      await returnHelpers.getLines(formatId, regionCode, dateFrom, dateTo)
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getLines)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal([formatId, regionCode, dateFrom, dateTo])
    })
  })

  experiment('.getLogLines', () => {
    let formatId
    let regionCode
    let logDateFrom

    beforeEach(async () => {
      formatId = 'test-format-id'
      regionCode = 'test-region-code'
      logDateFrom = '01/01/2000'

      await returnHelpers.getLogLines(formatId, regionCode, logDateFrom)
    })

    test('uses the correct query', async () => {
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getLogLines)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.query.lastCall.args
      expect(params).to.equal([
        formatId,
        regionCode,
        '20000101000000'
      ])
    })
  })

  experiment('.isNilReturn', () => {
    let formatId
    let regionCode
    let dateFrom
    let dateTo

    beforeEach(async () => {
      formatId = 'test-format-id'
      regionCode = 'test-region-code'
      dateFrom = 'test-date-from'
      dateTo = 'test-date-to'

      db.query.resolves([{ total_qty: 0 }])
    })

    test('uses the correct query', async () => {
      await returnHelpers.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.isNilReturn)
    })

    test('passes the expected params to the database query', async () => {
      await returnHelpers.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      const [, params] = db.query.lastCall.args
      expect(params).to.equal([formatId, regionCode, dateFrom, dateTo])
    })

    test('returns true if the total quantity is zero', async () => {
      db.query.resolves([{ total_qty: 0 }])
      const result = await returnHelpers.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      expect(result).to.equal(true)
    })

    test('returns false if the total quantity is not zero', async () => {
      db.query.resolves([{ total_qty: 1 }])
      const result = await returnHelpers.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      expect(result).to.equal(false)
    })
  })

  experiment('.getSplitDate', () => {
    let licenceNumber

    beforeEach(async () => {
      licenceNumber = 'test-licence-number'

      db.query.resolves([{ EFF_ST_DATE: '01/01/2000' }])
    })

    test('uses the correct query', async () => {
      await returnHelpers.getSplitDate(licenceNumber)
      const [query] = db.query.lastCall.args
      expect(query).to.equal(queries.getSplitDate)
    })

    test('passes the expected params to the database query', async () => {
      await returnHelpers.getSplitDate(licenceNumber)
      const [, params] = db.query.lastCall.args
      expect(params).to.equal([licenceNumber])
    })

    test('returns the date if there are result rows', async () => {
      db.query.resolves([{ EFF_ST_DATE: '01/01/2000' }])
      const result = await returnHelpers.getSplitDate(licenceNumber)
      expect(result).to.equal('2000-01-01')
    })

    test('returns null if there are no result rows', async () => {
      db.query.resolves([])
      const result = await returnHelpers.getSplitDate(licenceNumber)
      expect(result).to.equal(null)
    })
  })

  experiment('.getReturnVersionReason', () => {
    experiment('._createReturnVersionReasonCache', async () => {
      test('creates a cache with the expected method name', async () => {
        returnHelpers._createReturnVersionReasonCache()
        const [, methodName] = cache.createCachedQuery.lastCall.args
        expect(methodName).to.equal('getReturnVersionReason')
      })

      test('creates a cache with the required generate func', async () => {
        returnHelpers._createReturnVersionReasonCache()
        const [, , generate] = cache.createCachedQuery.lastCall.args
        const id = {
          licenceId: 'test-licence',
          regionCode: 'test-region',
          versionNumber: 'test-version'
        }

        await generate(id)

        const [query, params] = db.query.lastCall.args

        expect(query).to.equal(queries.getReturnVersionReason)
        expect(params).to.equal(['test-licence', 'test-version', 'test-region'])
      })
    })

    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(returnHelpers._getReturnVersionReasonCache, 'get')

      await returnHelpers.getReturnVersionReason('test-licence', 'test-region', 'test-version')

      const [id] = returnHelpers._getReturnVersionReasonCache.get.lastCall.args

      expect(id.id).to.equal('returnVersionReason:licenceId:test-licence:regionCode:test-region:versionNumber:test-version')
      expect(id.licenceId).to.equal('test-licence')
      expect(id.regionCode).to.equal('test-region')
      expect(id.versionNumber).to.equal('test-version')
    })
  })
})
