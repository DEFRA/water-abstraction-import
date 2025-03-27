'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const db = require('../../../../src/lib/connectors/db.js')
const TransformReturnHelpers = require('../../../../src/modules/licence-returns-import/lib/transform-returns-helpers.js')

// Thing under test
const TransformReturns = require('../../../../src/modules/licence-returns-import/lib/transform-returns.js')

experiment('modules/licence-returns-import/lib/transform-returns.js', () => {
  const licenceRef = '01/123'

  let dbStub

  beforeEach(() => {
    dbStub = Sinon.stub(db, 'query')

    Sinon.stub(TransformReturnHelpers, 'getFormatCycles').returns([
      { startDate: '2023-08-17', endDate: '2024-03-31', isCurrent: true },
      { startDate: '2024-04-01', endDate: '2025-01-13', isCurrent: true }
    ])

    // Stub _splitDate() to always return null. There were no legacy tests for when it isn't
    dbStub.onCall(1).resolves([])

    // Stub _purposes()
    dbStub.onCall(3).resolves([{
      APUR_APPR_CODE: 'C',
      APUR_APSE_CODE: 'CRW',
      APUR_APUS_CODE: '320',
      PURP_ALIAS: 'null',
      primary_purpose: 'Crown And Government',
      secondary_purpose: 'Crown - Other',
      tertiary_purpose: 'Pollution Remediation'
    }])

    // Stub _points()
    dbStub.onCall(4).resolves([{
      LOCAL_NAME: 'CATCH-PIT AT NENT HAGGS ADIT, NENTSBERRY, CUMBRIA',
      NGR1_SHEET: 'NY',
      NGR1_EAST: '76611',
      NGR1_NORTH: '45020',
      NGR2_SHEET: 'null',
      NGR2_EAST: 'null',
      NGR2_NORTH: 'null',
      NGR3_SHEET: 'null',
      NGR3_EAST: 'null',
      NGR3_NORTH: 'null',
      NGR4_SHEET: 'null',
      NGR4_EAST: 'null',
      NGR4_NORTH: 'null'
    }])
  })

  afterEach(() => {
    Sinon.restore()
  })

  experiment('when the licence has return formats', () => {
    beforeEach(() => {
      // Fetch the formats for the licence
      dbStub.onCall(0).resolves([{
        ID: '10061242',
        FGAC_REGION_CODE: '3',
        ARTC_REC_FREQ_CODE: 'M',
        ABS_PERIOD_ST_DAY: '1',
        ABS_PERIOD_ST_MONTH: '1',
        ABS_PERIOD_END_DAY: '31',
        ABS_PERIOD_END_MONTH: '12',
        FORM_PRODN_MONTH: '70',
        TIMELTD_ST_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        SITE_DESCR: 'CATCH-PIT AT PLACE, TOWN, COUNTY',
        TPT_FLAG: 'N',
        AABL_ID: '10028644',
        EFF_ST_DATE: '17/08/2023',
        EFF_END_DATE: '13/01/2025',
        VERS_NO: '1',
        AREP_AREA_CODE: 'NAREA',
        LICENCE_EXPIRY_DATE: '31/03/2026',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }])
    })

    experiment('and NALD form logs', () => {
      beforeEach(() => {
        // Stubbing call to _naldLogs()
        dbStub.onCall(2).resolves([
          { start_date: '2023-08-01', end_date: '2024-03-31', received_date: null }
        ])
      })

      test('the data is transformed into return logs', async () => {
        const results = await TransformReturns.go(licenceRef)

        expect(results).to.equal([
          {
            return_id: 'v1:3:01/123:10061242:2023-08-17:2024-03-31',
            regime: 'water',
            licence_type: 'abstraction',
            licence_ref: '01/123',
            start_date: '2023-08-17',
            end_date: '2024-03-31',
            due_date: '2024-04-28',
            returns_frequency: 'month',
            status: 'due',
            source: 'NALD',
            metadata: '{"version":1,"description":"CATCH-PIT AT PLACE, TOWN, COUNTY","purposes":[{"primary":{"code":"C","description":"Crown And Government"},"secondary":{"code":"CRW","description":"Crown - Other"},"tertiary":{"code":"320","description":"Pollution Remediation"}}],"points":[{"ngr1":"NY 766 450","ngr2":null,"ngr3":null,"ngr4":null,"name":"CATCH-PIT AT NENT HAGGS ADIT, NENTSBERRY, CUMBRIA"}],"nald":{"regionCode":3,"areaCode":"NAREA","formatId":10061242,"periodStartDay":"1","periodStartMonth":"1","periodEndDay":"31","periodEndMonth":"12"},"isTwoPartTariff":false,"isSummer":false,"isUpload":false,"isCurrent":true,"isFinal":false}',
            received_date: null,
            return_requirement: '10061242'
          }
        ])
      })
    })

    experiment('but no NALD form logs', () => {
      beforeEach(() => {
        // Stubbing call to _naldLogs()
        dbStub.onCall(2).resolves([])
      })

      test('then no results are returned', async () => {
        const results = await TransformReturns.go(licenceRef)

        expect(results).to.be.empty()
      })
    })
  })

  experiment('when the licence has no return formats', () => {
    beforeEach(() => {
      // Fetch the formats for the licence
      dbStub.onCall(0).resolves([])
    })

    test('then no results are returned', async () => {
      const results = await TransformReturns.go(licenceRef)

      expect(results).to.be.empty()
    })
  })

  experiment("when the licence's end date matches the return cycle's end date", () => {
    beforeEach(() => {
      // Fetch the formats for the licence
      dbStub.onCall(0).resolves([{
        ID: '10061242',
        FGAC_REGION_CODE: '3',
        ARTC_REC_FREQ_CODE: 'M',
        ABS_PERIOD_ST_DAY: '1',
        ABS_PERIOD_ST_MONTH: '1',
        ABS_PERIOD_END_DAY: '31',
        ABS_PERIOD_END_MONTH: '12',
        FORM_PRODN_MONTH: '70',
        TIMELTD_ST_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        SITE_DESCR: 'CATCH-PIT AT PLACE, TOWN, COUNTY',
        TPT_FLAG: 'N',
        AABL_ID: '10028644',
        EFF_ST_DATE: '17/08/2023',
        EFF_END_DATE: '13/01/2025',
        VERS_NO: '1',
        AREP_AREA_CODE: 'NAREA',
        LICENCE_EXPIRY_DATE: '31/03/2024',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }])

      // Stubbing call to _naldLogs()
      dbStub.onCall(2).resolves([
        { start_date: '2023-08-01', end_date: '2024-03-31', received_date: null }
      ])
    })

    test('flags the return as "final"', async () => {
      const results = await TransformReturns.go(licenceRef)

      const metadata = JSON.parse(results[0].metadata)

      expect(metadata.isFinal).to.be.true()
    })
  })
})
