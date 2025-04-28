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
const ReturnCycleHelpers = require('../../../../src/modules/licence-returns-import/lib/return-cycle-helpers.js')

experiment('modules/licence-returns-import/lib/return-cycle-helpers', () => {
  const summerCycles = [
    {
      end_date: '2022-10-31',
      is_summer: true,
      return_cycle_id: 'b45d103d-5006-4b47-8f77-b9f9ea3db51c',
      start_date: '2021-11-01'
    },
    {
      end_date: '2023-10-31',
      is_summer: true,
      return_cycle_id: 'b8f1abb5f-67da-48f5-81e7-49c4969d7f93',
      start_date: '2022-11-01'
    },
    {
      end_date: '2024-10-31',
      is_summer: true,
      return_cycle_id: 'bfcfb7a7-6f21-44cf-a455-d2ffee9af5af',
      start_date: '2023-11-01'
    }
  ]

  const winterCycles = [
    {
      end_date: '2022-03-31',
      is_summer: false,
      return_cycle_id: '50b8a9ae-a2ca-4854-a390-1e4e42c0b9d7',
      start_date: '2021-04-01'
    },
    {
      end_date: '2023-03-31',
      is_summer: false,
      return_cycle_id: 'cd21025c-4a3b-463b-a8fc-6d58666054c3',
      start_date: '2022-04-01'
    },
    {
      end_date: '2024-03-31',
      is_summer: false,
      return_cycle_id: '2fc23cfc-6287-49ab-af8c-6c8215504722',
      start_date: '2023-04-01'
    }
  ]

  experiment('fetch()', () => {
    beforeEach(() => {
      Sinon.stub(db, 'query').onFirstCall().resolves([...winterCycles, ...summerCycles])
    })

    afterEach(() => {
      Sinon.restore()
    })

    test('returns an object containing both the summer and winter return cycles found', async () => {
      const result = await ReturnCycleHelpers.fetch()

      expect(result.summer).equal(summerCycles)
      expect(result.winter).equal(winterCycles)
    })
  })

  experiment('match()', () => {
    const returnCycles = { summer: summerCycles, winter: winterCycles }

    let returnLog

    experiment('when the return log is for the "summer" cycle', () => {
      beforeEach(() => {
        returnLog = {
          due_date: '2023-11-28',
          end_date: '2023-10-31',
          licence_ref: '01/234/567',
          licence_type: 'abstraction',
          regime: 'water',
          return_id: 'v1:123:456',
          return_requirement: '012345',
          returns_frequency: 'month',
          sent_date: '2023-11-01',
          source: 'NALD',
          start_date: '2022-11-01',
          status: 'completed'
        }
      })

      experiment('and metadata is a JSON string (the case for those that start before 2018-10-31)', () => {
        beforeEach(() => {
          returnLog.metadata = JSON.stringify({ isSummer: true, param: 'value', version: '1' })
        })

        test('returns the matching return cycle', () => {
          const result = ReturnCycleHelpers.match(returnCycles, returnLog)

          expect(result).to.equal(summerCycles[1])
        })
      })

      experiment('and metadata is a JSON object (the case for those that start after 2018-10-31)', () => {
        beforeEach(() => {
          returnLog.metadata = { isSummer: true, param: 'value', version: '1' }
        })

        test('returns the matching return cycle', () => {
          const result = ReturnCycleHelpers.match(returnCycles, returnLog)

          expect(result).to.equal(summerCycles[1])
        })
      })
    })

    experiment('when return log is for the "winter" cycle', () => {
      // NOTE: As an added check, we make our winter return log a 'split-log i.e. it starts part way through the year
      beforeEach(() => {
        returnLog = {
          due_date: '2023-04-28',
          end_date: '2023-03-31',
          licence_ref: '01/234/567',
          licence_type: 'abstraction',
          regime: 'water',
          return_id: 'v1:123:456',
          return_requirement: '012345',
          returns_frequency: 'month',
          sent_date: '2023-04-01',
          source: 'NALD',
          start_date: '2022-06-01',
          status: 'completed'
        }
      })

      experiment('and metadata is a JSON string (the case for those that start before 2018-10-31)', () => {
        beforeEach(() => {
          returnLog.metadata = JSON.stringify({ isSummer: false, param: 'value', version: '1' })
        })

        test('returns the matching return cycle', () => {
          const result = ReturnCycleHelpers.match(returnCycles, returnLog)

          expect(result).to.equal(winterCycles[1])
        })
      })

      experiment('and metadata is a JSON object (the case for those that start after 2018-10-31)', () => {
        beforeEach(() => {
          returnLog.metadata = { isSummer: false, param: 'value', version: '1' }
        })

        test('returns the matching return cycle', () => {
          const result = ReturnCycleHelpers.match(returnCycles, returnLog)

          expect(result).to.equal(winterCycles[1])
        })
      })
    })
  })
})
