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
const OldLinesCheck = require('../../../../src/modules/licence-submissions-import/lib/old-lines-check.js')

experiment('modules/licence-submissions-import/lib/old-lines-check', () => {
  let dbStub

  beforeEach(() => {
    dbStub = Sinon.stub(db, 'query')
  })

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when the old lines table', () => {
    experiment('does not exist', () => {
      beforeEach(() => {
        dbStub.onFirstCall().resolves([{ table_exists: false }])
      })

      test('returns false', async () => {
        const result = await OldLinesCheck.go()

        expect(result).to.be.false()
      })
    })

    experiment('exists', () => {
      beforeEach(() => {
        dbStub.onFirstCall().resolves([{ table_exists: true }])
      })

      experiment('but has no data', () => {
        beforeEach(() => {
          dbStub.onSecondCall().resolves([{ row_count: 0 }])
        })

        test('returns false', async () => {
          const result = await OldLinesCheck.go()

          expect(result).to.be.false()
        })
      })

      experiment('and has data', () => {
        beforeEach(() => {
          dbStub.onSecondCall().resolves([{ row_count: 1 }])
        })

        test('returns true', async () => {
          const result = await OldLinesCheck.go()

          expect(result).to.be.true()
        })
      })
    })
  })
})
