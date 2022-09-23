'use strict'

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')
const sandbox = require('sinon').createSandbox()

const core = require('../../../../../src/modules/nald-import/lib/nald-queries/core')
const db = require('../../../../../src/modules/nald-import/lib/db')
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/core')

experiment('modules/nald-import/lib/nald-queries/core', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery').resolves([])
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.importTableExists', () => {
    test('uses the correct query', async () => {
      await core.importTableExists()
      const [query] = db.dbQuery.lastCall.args
      expect(query).to.equal(sql.importTableExists)
    })

    experiment('when there are no import table', () => {
      test('false is returned', async () => {
        const result = await core.importTableExists()
        expect(result).to.equal(false)
      })
    })

    experiment('when all the import tables are not present yet', () => {
      test('false is returned', async () => {
        db.dbQuery.resolves([{ count: 50 }])
        const result = await core.importTableExists()
        expect(result).to.equal(false)
      })
    })

    experiment('when all the import tables are present', () => {
      test('true is returned', async () => {
        db.dbQuery.resolves([{ count: 128 }])
        const result = await core.importTableExists()
        expect(result).to.equal(true)
      })
    })
  })
})
