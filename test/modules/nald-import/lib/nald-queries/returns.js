'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const returns = require('../../../../../src/modules/nald-import/lib/nald-queries/returns')
const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/returns')

experiment('modules/nald-import/lib/queries/returns', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery')
    sandbox.stub(cache, 'createCachedQuery')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.getFormats', () => {
    beforeEach(async () => {
      await returns.getFormats('test-lic')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getFormats)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-lic'])
    })
  })

  experiment('.getFormatPurposes', () => {
    beforeEach(async () => {
      await returns.getFormatPurposes('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getFormatPurposes)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-format', 'test-region'])
    })
  })

  experiment('.getFormatPoints', () => {
    beforeEach(async () => {
      await returns.getFormatPoints('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getFormatPoints)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal(['test-format', 'test-region'])
    })
  })

  experiment('.getLogs', () => {
    beforeEach(async () => {
      await returns.getLogs('test-format', 'test-region')
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getLogs)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
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
      await returns.getLines(formatId, regionCode, dateFrom, dateTo)
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getLines)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
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

      await returns.getLogLines(formatId, regionCode, logDateFrom)
    })

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getLogLines)
    })

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args
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

      db.dbQuery.resolves([{ total_qty: 0 }])
    })

    test('uses the correct query', async () => {
      await returns.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.isNilReturn)
    })

    test('passes the expected params to the database query', async () => {
      await returns.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal([formatId, regionCode, dateFrom, dateTo])
    })

    test('returns true if the total quantity is zero', async () => {
      db.dbQuery.resolves([{ total_qty: 0 }])
      const result = await returns.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      expect(result).to.equal(true)
    })

    test('returns false if the total quantity is not zero', async () => {
      db.dbQuery.resolves([{ total_qty: 1 }])
      const result = await returns.isNilReturn(formatId, regionCode, dateFrom, dateTo)
      expect(result).to.equal(false)
    })
  })

  experiment('.getSplitDate', () => {
    let licenceNumber

    beforeEach(async () => {
      licenceNumber = 'test-licence-number'

      db.dbQuery.resolves([{ EFF_ST_DATE: '01/01/2000' }])
    })

    test('uses the correct query', async () => {
      await returns.getSplitDate(licenceNumber)
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.getSplitDate)
    })

    test('passes the expected params to the database query', async () => {
      await returns.getSplitDate(licenceNumber)
      const [, params] = db.dbQuery.lastCall.args
      expect(params).to.equal([licenceNumber])
    })

    test('returns the date if there are result rows', async () => {
      db.dbQuery.resolves([{ EFF_ST_DATE: '01/01/2000' }])
      const result = await returns.getSplitDate(licenceNumber)
      expect(result).to.equal('2000-01-01')
    })

    test('returns null if there are no result rows', async () => {
      db.dbQuery.resolves([])
      const result = await returns.getSplitDate(licenceNumber)
      expect(result).to.equal(null)
    })
  })

  experiment('.getReturnVersionReason', () => {
    experiment('._createReturnVersionReasonCache', async () => {
      test('creates a cache with the expected method name', async () => {
        returns._createReturnVersionReasonCache()
        const [, methodName] = cache.createCachedQuery.lastCall.args
        expect(methodName).to.equal('getReturnVersionReason')
      })

      test('creates a cache with the required generate func', async () => {
        returns._createReturnVersionReasonCache()
        const [, , generate] = cache.createCachedQuery.lastCall.args
        const id = {
          licenceId: 'test-licence',
          regionCode: 'test-region',
          versionNumber: 'test-version'
        }

        await generate(id)

        const [query, params] = db.dbQuery.lastCall.args

        expect(query).to.equal(sql.getReturnVersionReason)
        expect(params).to.equal(['test-licence', 'test-version', 'test-region'])
      })
    })

    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(returns._getReturnVersionReasonCache, 'get')

      await returns.getReturnVersionReason('test-licence', 'test-region', 'test-version')

      const [id] = returns._getReturnVersionReasonCache.get.lastCall.args

      expect(id.id).to.equal('returnVersionReason:licenceId:test-licence:regionCode:test-region:versionNumber:test-version')
      expect(id.licenceId).to.equal('test-licence')
      expect(id.regionCode).to.equal('test-region')
      expect(id.versionNumber).to.equal('test-version')
    })
  })
})
