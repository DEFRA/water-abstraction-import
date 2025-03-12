'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const db = require('../../../../src/lib/connectors/db.js')
// const returnHelpers = require('../../../../src/modules/return-logs/lib/return-helpers.js')

// Thing under test
const DueDate = require('../../../../src/modules/licence-returns-import/lib/due-date.js')

experiment('modules/return-logs/lib/due-date', () => {
  let dbStub
  let endDate

  const formats = {
    nullEndDate: {
      AABL_ID: 'licence_id_1',
      FGAC_REGION_CODE: 'region_1',
      EFF_END_DATE: 'null',
      VERS_NO: '100'
    },
    differentEndDate: {
      AABL_ID: 'licence_id_1',
      FGAC_REGION_CODE: 'region_1',
      EFF_END_DATE: '31/03/2019',
      VERS_NO: '100'
    },
    summerProductionMonth: {
      AABL_ID: 'licence_id_1',
      FGAC_REGION_CODE: 'region_1',
      EFF_END_DATE: '01/01/2019',
      FORM_PRODN_MONTH: '45',
      VERS_NO: '100'
    },
    winterProductionMonth: {
      AABL_ID: 'licence_id_1',
      FGAC_REGION_CODE: 'region_1',
      EFF_END_DATE: '01/01/2019',
      FORM_PRODN_MONTH: '66',
      VERS_NO: '100'
    }
  }

  beforeEach(() => {
    dbStub = Sinon.stub(db, 'query')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('for a split log cycle', () => {
    experiment('when the return version end date is null', () => {
      beforeEach(async () => {
        endDate = '2019-01-01'
        dbStub.resolves([])
      })

      test('returns 28 days after split end date', async () => {
        const result = await DueDate.go(endDate, formats.nullEndDate)
        expect(result).to.equal('2019-01-29')
      })
    })

    experiment('when the return version end date is different to the split end date', () => {
      beforeEach(async () => {
        endDate = '2019-01-01'
        dbStub.resolves([])
      })

      test('returns 28 days after split end date', async () => {
        const result = await DueDate.go(endDate, formats.differentEndDate)
        expect(result).to.equal('2019-01-29')
      })
    })

    experiment('when the returns version end date equals the split end date', () => {
      beforeEach(async () => {
        endDate = '2019-01-01'
        dbStub.resolves([])
      })

      experiment('and the mod log reason is in [VARF, VARM, AMND, NAME, REDS, SPAC, SPAN, XCORR]', () => {
        beforeEach(async () => {
          dbStub.resolves([{ AMRE_CODE: 'VARF' }])
        })

        test('the getReturnVersionReason query is called with licence ID, region, and the incremented return version number', async () => {
          await DueDate.go(endDate, formats.summerProductionMonth)

          const params = dbStub.firstCall.args[1]

          expect(params).to.equal(['licence_id_1', 101, 'region_1'])
        })

        test('returns 28 days after cycle end date for summer production month', async () => {
          const result = await DueDate.go(endDate, formats.summerProductionMonth)

          expect(result).to.equal('2019-11-28')
        })

        test('returns 28 days after cycle end date for winter production month', async () => {
          const result = await DueDate.go(endDate, formats.winterProductionMonth)

          expect(result).to.equal('2019-04-28')
        })
      })

      experiment('and the mod log reason is not in VARF, VARM, AMND, NAME, REDS, SPAC, SPAN, XCORR', () => {
        beforeEach(async () => {
          dbStub.resolves([{ AMRE_CODE: 'NO-MATCH' }])
        })

        test('the getReturnVersionReason query is called with licence ID, region, and the incremented return version number', async () => {
          await DueDate.go(endDate, formats.summerProductionMonth)

          const params = dbStub.firstCall.args[1]

          expect(params).to.equal(['licence_id_1', 101, 'region_1'])
        })

        test('returns 28 days after split end date for summer production month', async () => {
          const result = await DueDate.go(endDate, formats.summerProductionMonth)

          expect(result).to.equal('2019-01-29')
        })

        test('returns 28 days after split end date for winter production month', async () => {
          const result = await DueDate.go(endDate, formats.winterProductionMonth)

          expect(result).to.equal('2019-01-29')
        })
      })
    })
  })

  experiment('for the cycle ending 2020-03-31 affected by coronavirus', () => {
    beforeEach(() => {
      endDate = '2020-03-31'
    })

    test('the due date is 2020-10-16', async () => {
      const result = await DueDate.go(endDate, formats.nullEndDate)

      expect(result).to.equal('2020-10-16')
    })
  })
})
