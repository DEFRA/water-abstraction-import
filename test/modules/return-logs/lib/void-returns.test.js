'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = (exports.lab = Lab.script())
const { expect } = Code

// Things we need to stub
const db = require('../../../../src/lib/connectors/db.js')

// Thing under test
const VoidReturns = require('../../../../src/modules/return-logs/lib/void-returns.js')

experiment('modules/return-logs/lib/void-returns', () => {
  const licenceRef = '04/567/890'
  const rows = [{ return_id: 'v1:123:456' }, { return_id: 'v1:234:789' }]

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when called for a licence during the import process', () => {
    beforeEach(() => {
      Sinon.stub(db, 'query').onFirstCall().resolves()
    })

    test('runs a query to void all return logs whose IDs do not match those generated by the import', async () => {
      await VoidReturns.go(licenceRef, rows)

      const params = db.query.firstCall.args[1]

      // Confirm all the params required were passed to the query
      expect(params).to.equal([licenceRef, ['v1:123:456', 'v1:234:789']])
    })
  })
})
