const { test, experiment } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const date = require('../../../../../src/modules/licence-import/transform/mappers/date')

experiment('modules/licence-import/mappers/date', () => {
  experiment('mapNaldDate', () => {
    test('a null string is mapped to null', async () => {
      const result = date.mapNaldDate('null')
      expect(result).to.equal(null)
    })

    test('a date in NALD format is mapped to the service format', async () => {
      const result = date.mapNaldDate('14/02/2019')
      expect(result).to.equal('2019-02-14')
    })
  })

  experiment('getMinDate', () => {
    test('the earliest valid date is returned', async () => {
      const dates = [
        '2018-01-01',
        'null',
        '2017-05-06',
        '2019-02-01'
      ]

      const result = date.getMinDate(dates)
      expect(result).to.equal('2017-05-06')
    })

    test('when there are no valid dates, null is returned', async () => {
      const dates = [
        'My birthday',
        'null',
        'Last Thursday'
      ]

      const result = date.getMinDate(dates)
      expect(result).to.equal(null)
    })
  })

  experiment('getMaxDate', () => {
    test('the latest valid date is returned', async () => {
      const dates = [
        '2018-01-01',
        'null',
        '2017-05-06',
        '2019-02-01'
      ]

      const result = date.getMaxDate(dates)
      expect(result).to.equal('2019-02-01')
    })

    test('when there are no valid dates, null is returned', async () => {
      const dates = [
        'My birthday',
        'null',
        'Last Thursday'
      ]

      const result = date.getMaxDate(dates)
      expect(result).to.equal(null)
    })
  })

  experiment('mapTransferDate', () => {
    test('converts a full datestamp in NALD format to a date in YYYY-MM-DD format', async () => {
      const result = date.mapTransferDate('04/12/2015 12:52:00')
      expect(result).to.equal('2015-12-04')
    })
  })

  experiment('getPreviousDay', () => {
    test('gets a date 1 day before the specified date', async () => {
      const result = date.getPreviousDay('2018-06-07')
      expect(result).to.equal('2018-06-06')
    })
  })

  experiment('mapTransferDate', () => {
    test('converts a full datestamp in NALD format to a date in YYYY-MM-DD format', async () => {
      const result = date.mapTransferDate('04/12/2015 12:52:00')
      expect(result).to.equal('2015-12-04')
    })
  })

  experiment('mapIsoDateToNald', () => {
    test('maps ISO format to NALD format', async () => {
      const result = date.mapIsoDateToNald('2018-06-07')
      expect(result).to.equal('07/06/2018')
    })

    test('maps true null to string "null"', async () => {
      const result = date.mapIsoDateToNald(null)
      expect(result).to.equal('null')
    })
  })
})
