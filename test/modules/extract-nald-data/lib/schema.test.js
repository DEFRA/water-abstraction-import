'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const db = require('../../../../src/lib/connectors/db.js')

// Thing under test
const Schema = require('../../../../src/modules/extract-nald-data/lib/schema.js')

experiment('modules/extract-nald-data/lib/schema.js', () => {
  const schemaName = 'test_schema'

  let dbStub

  beforeEach(async () => {
    dbStub = Sinon.stub(db, 'query').resolves()
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.dropAndCreateSchema', () => {
    test('the schema is dropped', async () => {
      await Schema.dropAndCreateSchema(schemaName)

      const [query] = dbStub.firstCall.args

      expect(query).to.equal(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`)
    })

    test('the schema is re-created', async () => {
      await Schema.dropAndCreateSchema(schemaName)

      const [query] = dbStub.secondCall.args

      expect(query).to.equal(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
    })
  })

  experiment('.swapTemporarySchema', () => {
    test('the schema is dropped', async () => {
      await Schema.swapTemporarySchema()

      const [query] = dbStub.firstCall.args

      expect(query).to.equal('DROP SCHEMA IF EXISTS import CASCADE;')
    })

    test('the schema is re-created', async () => {
      await Schema.swapTemporarySchema()

      const [query] = dbStub.secondCall.args

      expect(query).to.equal('ALTER SCHEMA import_temp RENAME TO import;')
    })
  })
})
