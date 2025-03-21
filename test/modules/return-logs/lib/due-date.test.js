'use strict'

const sandbox = require('sinon').createSandbox()
const { experiment, test, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const dueDate = require('../../../../src/modules/return-logs/lib/due-date.js')
const returnHelpers = require('../../../../src/modules/return-logs/lib/return-helpers.js')

experiment('modules/return-logs/lib/due-date', () => {
  experiment('getDueDate', () => {
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

    experiment('for a split log cycle', () => {
      const endDate = '2019-01-01'

      beforeEach(async () => {
        sandbox.stub(returnHelpers, 'getReturnVersionReason').resolves([])
      })

      afterEach(async () => {
        sandbox.restore()
      })

      test('returns 28 days after split end date if the return version end date is null', async () => {
        const result = await dueDate.getDueDate(endDate, formats.nullEndDate)
        expect(result).to.equal('2019-01-29')
      })

      test('returns 28 days after split end date if the return version end date is different to the split end date', async () => {
        const result = await dueDate.getDueDate(endDate, formats.differentEndDate)
        expect(result).to.equal('2019-01-29')
      })

      experiment('when the returns version end date equals the split end date', () => {
        test('the getReturnVersionReason query is called with licence ID, region, and the incremented return version number', async () => {
          await dueDate.getDueDate(endDate, formats.summerProductionMonth)
          const { args } = returnHelpers.getReturnVersionReason.lastCall
          expect(args).to.equal(['licence_id_1', 'region_1', 101])
        })

        experiment('and the mod log reason is in VARF, VARM, AMND, NAME, REDS, SPAC, SPAN, XCORR', () => {
          beforeEach(async () => {
            returnHelpers.getReturnVersionReason.resolves([{
              AMRE_CODE: 'VARF'
            }])
          })

          test('returns 28 days after cycle end date for summer production month', async () => {
            const result = await dueDate.getDueDate(endDate, formats.summerProductionMonth)
            expect(result).to.equal('2019-11-28')
          })

          test('returns 28 days after cycle end date for winter production month', async () => {
            const result = await dueDate.getDueDate(endDate, formats.winterProductionMonth)
            expect(result).to.equal('2019-04-28')
          })
        })

        experiment('and the mod log reason is not in VARF, VARM, AMND, NAME, REDS, SPAC, SPAN, XCORR', () => {
          beforeEach(async () => {
            returnHelpers.getReturnVersionReason.resolves([{
              AMRE_CODE: 'NO-MATCH'
            }])
          })

          test('returns 28 days after split end date for summer production month', async () => {
            const result = await dueDate.getDueDate(endDate, formats.summerProductionMonth)
            expect(result).to.equal('2019-01-29')
          })

          test('returns 28 days after split end date for winter production month', async () => {
            const result = await dueDate.getDueDate(endDate, formats.winterProductionMonth)
            expect(result).to.equal('2019-01-29')
          })
        })
      })
    })

    experiment('for the cycle ending 2020-03-31 affected by coronavirus', () => {
      test('the due date is 2020-10-16', async () => {
        const result = await dueDate.getDueDate('2020-03-31', formats.nullEndDate)
        expect(result).to.equal('2020-10-16')
      })
    })
  })
})
