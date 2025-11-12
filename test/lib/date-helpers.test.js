'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, before } = (exports.lab = Lab.script())
const { expect } = Code

// Thing under test
const DateHelpersLib = require('../../src/lib/date-helpers.js')

experiment('src/lib/date-helpers.js', () => {
  experiment('compareDates', () => {
    let firstDate
    let secondDate

    experiment('when the first date is before the second date', () => {
      before(async () => {
        firstDate = new Date('2025-10-01')
        secondDate = new Date('2025-10-15')
      })

      test('returns -1', () => {
        const result = DateHelpersLib.compareDates(firstDate, secondDate)

        expect(result).to.equal(-1)
      })
    })

    experiment('when the first date is after the second date', () => {
      before(async () => {
        firstDate = new Date('2025-10-15')
        secondDate = new Date('2025-10-01')
      })

      test('returns 1', () => {
        const result = DateHelpersLib.compareDates(firstDate, secondDate)

        expect(result).to.equal(1)
      })
    })

    experiment('when the first date is the same as the second date', () => {
      before(async () => {
        firstDate = new Date('2025-10-15')
        secondDate = new Date('2025-10-15')
      })

      test('returns 0', () => {
        const result = DateHelpersLib.compareDates(firstDate, secondDate)

        expect(result).to.equal(0)
      })
    })
  })
})
