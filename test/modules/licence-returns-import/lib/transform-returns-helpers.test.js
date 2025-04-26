'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, beforeEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
moment.locale('en-gb')

// Thing under test
const TransformReturnsHelpers = require('../../../../src/modules/licence-returns-import/lib/transform-returns-helpers.js')

experiment.only('modules/licence-returns-import/lib/transform-returns-helpers', () => {
  experiment('.addDate', () => {
    test('add a date if within range', async () => {
      expect(TransformReturnsHelpers.addDate([], '2018-12-01', '2018-01-01', '2018-12-31')).to.equal(['2018-12-01'])
    })
    test('dont add a date if before start date', async () => {
      expect(TransformReturnsHelpers.addDate([], '2017-12-01', '2018-01-01', '2018-12-31')).to.equal([])
    })
    test('dont add a date if after end date', async () => {
      expect(TransformReturnsHelpers.addDate([], '2018-12-05', '2018-01-01', '2018-11-31')).to.equal([])
    })
    test('dont add a date if on start date', async () => {
      expect(TransformReturnsHelpers.addDate([], '2017-12-01', '2017-12-01', '2018-12-31')).to.equal([])
    })
    test('dont add a date if on end date', async () => {
      expect(TransformReturnsHelpers.addDate([], '2018-11-31', '2018-01-01', '2018-11-31')).to.equal([])
    })
    test('dont add duplicate dates', async () => {
      let dates = []
      dates = TransformReturnsHelpers.addDate(dates, '2018-12-01', '2018-01-01', '2018-12-31')
      dates = TransformReturnsHelpers.addDate(dates, '2018-12-01', '2018-01-01', '2018-12-31')
      expect(dates).to.equal(['2018-12-01'])
    })
  })

  experiment('.formatReturnMetadata', () => {
    let format
    let purposes
    let points

    beforeEach(() => {
      format = { TPT_FLAG: 'N', AREP_AREA_CODE: 'KAEA', FORM_PRODN_MONTH: '65' }

      const basePurpose = {
        APUR_APPR_CODE: 'W',
        APUR_APSE_CODE: 'WAT',
        APUR_APUS_CODE: '180',
        primary_purpose: 'primary',
        secondary_purpose: 'secondary',
        tertiary_purpose: 'tertiary'
      }

      purposes = [
        { PURP_ALIAS: 'Water alias', ...basePurpose },
        { PURP_ALIAS: 'Agri alias', ...basePurpose },
        { PURP_ALIAS: 'null', ...basePurpose },
        { PURP_ALIAS: 'Null', ...basePurpose },
        { PURP_ALIAS: 'NULL', ...basePurpose },
        { PURP_ALIAS: ' null ', ...basePurpose }
      ]

      points = []
    })

    test('the purposes contain the alias', async () => {
      const result = TransformReturnsHelpers.formatReturnMetadata(format, purposes, points)

      expect(result.purposes[0].alias).to.equal('Water alias')
      expect(result.purposes[1].alias).to.equal('Agri alias')
    })

    test('null aliases are ignored', async () => {
      const result = TransformReturnsHelpers.formatReturnMetadata(format, purposes, points)

      expect(result.purposes[2].alias).to.be.undefined()
      expect(result.purposes[3].alias).to.be.undefined()
      expect(result.purposes[4].alias).to.be.undefined()
      expect(result.purposes[5].alias).to.be.undefined()
    })

    test('the area code is added to the metadata', async () => {
      const result = TransformReturnsHelpers.formatReturnMetadata(format, purposes, points)

      expect(result.nald.areaCode).to.equal('KAEA')
    })

    test('adds an isTwoPartTariff flag', async () => {
      const result = TransformReturnsHelpers.formatReturnMetadata(format, purposes, points)

      expect(result.isTwoPartTariff).to.be.false()
    })

    test('adds an isSummer flag', async () => {
      const result = TransformReturnsHelpers.formatReturnMetadata(format, purposes, points)

      expect(result.isSummer).to.be.true()
    })
  })

  experiment('.getFormatCycles', () => {
    test('It should calculate summer cycle', async () => {
      const format = {
        FORM_PRODN_MONTH: '80',
        EFF_ST_DATE: '23/05/2016',
        TIMELTD_ST_DATE: 'null',
        EFF_END_DATE: '30/03/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }
      const cycles = TransformReturnsHelpers.getFormatCycles(format, '2014-04-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-23', endDate: '2016-10-31', isCurrent: true },
        { startDate: '2016-11-01', endDate: '2017-10-31', isCurrent: true },
        { startDate: '2017-11-01', endDate: '2018-03-30', isCurrent: true }
      ])
    })

    test('It should calculate winter cycle', async () => {
      const format = {
        FORM_PRODN_MONTH: '66',
        EFF_ST_DATE: '23/05/2016',
        TIMELTD_ST_DATE: 'null',
        EFF_END_DATE: '30/03/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }
      const cycles = TransformReturnsHelpers.getFormatCycles(format, '2014-04-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-23', endDate: '2017-03-31', isCurrent: true },
        { startDate: '2017-04-01', endDate: '2018-03-30', isCurrent: true }
      ])
    })

    test('It should split cycles on current licence version start date', async () => {
      const format = {
        FORM_PRODN_MONTH: '66',
        EFF_ST_DATE: '23/05/2016',
        TIMELTD_ST_DATE: 'null',
        EFF_END_DATE: '30/03/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }
      const cycles = TransformReturnsHelpers.getFormatCycles(format, '2017-06-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-23', endDate: '2017-03-31', isCurrent: false },
        { startDate: '2017-04-01', endDate: '2017-05-31', isCurrent: false },
        { startDate: '2017-06-01', endDate: '2018-03-30', isCurrent: true }
      ])
    })

    test('It should observe time limited start/end dates for summer cycle', async () => {
      const format = {
        FORM_PRODN_MONTH: '80',
        EFF_ST_DATE: '23/05/2016',
        TIMELTD_ST_DATE: '25/05/2016',
        EFF_END_DATE: '30/03/2018',
        TIMELTD_END_DATE: '28/03/2018',
        LICENCE_EXPIRY_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }
      const cycles = TransformReturnsHelpers.getFormatCycles(format, '2014-04-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-25', endDate: '2016-10-31', isCurrent: true },
        { startDate: '2016-11-01', endDate: '2017-10-31', isCurrent: true },
        { startDate: '2017-11-01', endDate: '2018-03-28', isCurrent: true }
      ])
    })

    test('a licence ended date is respected and the cycles are reduced in length', async () => {
    // here the licence has expired before the version end date
      const format = {
        FORM_PRODN_MONTH: '80',
        EFF_ST_DATE: '23/05/2016',
        TIMELTD_ST_DATE: 'null',
        EFF_END_DATE: '30/03/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_EXPIRY_DATE: '01/01/2017',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null'
      }

      const cycles = TransformReturnsHelpers.getFormatCycles(format, '2014-04-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-23', endDate: '2016-10-31', isCurrent: true },
        { startDate: '2016-11-01', endDate: '2017-01-01', isCurrent: true }
      ])
    })
  })

  experiment('.getFormatEndDate', () => {
    test('returns null when all dates are null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal(null)
    })

    test('returns effective end date if time limited date is null', async () => {
      const format = {
        EFF_END_DATE: '22/02/2014',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2014-02-22')
    })

    test('returns effective end date if time limited date is after effective end date', async () => {
      const format = {
        EFF_END_DATE: '22/02/2014',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2014-02-22')
    })

    test('returns time limited end date if effective end date is null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2014-02-23')
    })
    test('returns time limited end date if before effective end date', async () => {
      const format = {
        EFF_END_DATE: '25/04/2015',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2014-02-23')
    })

    test('returns the licence expiry date is not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '01/01/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the licence revocation date is not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '02/02/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-02-02')
    })

    test('returns the licence lapsed date if not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '01/01/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the earliest date of licence has multiple dates', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: '01/01/2018',
        LICENCE_LAPSED_DATE: '02/02/2018',
        LICENCE_EXPIRY_DATE: '03/03/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns time limited end date if before the licence dates', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: '01/01/2018',
        LICENCE_REVOKED_DATE: '02/02/2018',
        LICENCE_LAPSED_DATE: '03/03/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns effective end date if before the licence dates', async () => {
      const format = {
        EFF_END_DATE: '01/01/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: '02/02/2018',
        LICENCE_LAPSED_DATE: '03/03/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the licence lapsed date if before effective end date', async () => {
      const format = {
        EFF_END_DATE: '02/02/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: '01/01/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(TransformReturnsHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })
  })

  experiment('.getFormatStartDate', () => {
    test('It should return version start date when time limited date is null', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: 'null'
      }
      expect(TransformReturnsHelpers.getFormatStartDate(format)).to.equal('2017-05-03')
    })

    test('It should return version start date if after time limited start date', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: '01/05/2016'
      }
      expect(TransformReturnsHelpers.getFormatStartDate(format)).to.equal('2017-05-03')
    })

    test('It should return time limited start date if after version start date', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: '04/12/2017'
      }
      expect(TransformReturnsHelpers.getFormatStartDate(format)).to.equal('2017-12-04')
    })
  })

  experiment('.getReturnCycles', () => {
    test('getReturnCycles - single financial year, current version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-04-01', '2015-03-31', '2014-04-01', false)
      expect(cycles).to.equal([{
        startDate: '2014-04-01',
        endDate: '2015-03-31',
        isCurrent: true
      }])
    })
    test('getReturnCycles - single financial year, expired version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-04-01', '2015-03-31', '2016-04-01', false)
      expect(cycles).to.equal([{
        startDate: '2014-04-01',
        endDate: '2015-03-31',
        isCurrent: false
      }])
    })
    test('getReturnCycles - part financial years, current version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2010-04-01', false)
      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2015-03-31',
          isCurrent: true
        },
        {
          startDate: '2015-04-01',
          endDate: '2015-07-01',
          isCurrent: true
        }])
    })

    test('getReturnCycles - part financial years, expired version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2018-04-01', false)
      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2015-03-31',
          isCurrent: false
        },
        {
          startDate: '2015-04-01',
          endDate: '2015-07-01',
          isCurrent: false
        }])
    })

    test('getReturnCycles - part financial years, expiry on period start', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2015-04-01', false)
      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2015-03-31',
          isCurrent: false
        },
        {
          startDate: '2015-04-01',
          endDate: '2015-07-01',
          isCurrent: true
        }])
    })

    test('getReturnCycles - part financial years, expiry part-way through period', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2015-06-01', false)
      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2015-03-31',
          isCurrent: false
        },
        {
          startDate: '2015-04-01',
          endDate: '2015-05-31',
          isCurrent: false
        },
        {
          startDate: '2015-06-01',
          endDate: '2015-07-01',
          isCurrent: true
        }])
    })

    test('getReturnCycles - single summer year, current version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-11-01', '2015-10-31', '2014-11-01', true)
      expect(cycles).to.equal([{
        startDate: '2014-11-01',
        endDate: '2015-10-31',
        isCurrent: true
      }])
    })
    test('getReturnCycles - single summer year, expired version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-11-01', '2015-10-31', '2016-04-01', true)
      expect(cycles).to.equal([{
        startDate: '2014-11-01',
        endDate: '2015-10-31',
        isCurrent: false
      }])
    })
    test('getReturnCycles - part summer years, current version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-12-01', '2010-04-01', true)
      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2014-10-31',
          isCurrent: true
        },
        {
          startDate: '2014-11-01',
          endDate: '2015-10-31',
          isCurrent: true
        },
        {
          startDate: '2015-11-01',
          endDate: '2015-12-01',
          isCurrent: true
        }])
    })

    test('getReturnCycles - part summer years, expired version', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2018-04-01', true)

      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2014-10-31',
          isCurrent: false
        },
        {
          startDate: '2014-11-01',
          endDate: '2015-07-01',
          isCurrent: false
        }])
    })

    test('getReturnCycles - part summer years, expiry on period start', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2016-07-01', '2015-11-01', true)

      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2014-10-31',
          isCurrent: false
        },
        {
          startDate: '2014-11-01',
          endDate: '2015-10-31',
          isCurrent: false
        },
        {
          startDate: '2015-11-01',
          endDate: '2016-07-01',
          isCurrent: true
        }])
    })

    test('getReturnCycles - part summer years, expiry part-way through period', async () => {
      const cycles = TransformReturnsHelpers.getReturnCycles('2014-06-01', '2016-07-01', '2015-06-01', true)

      expect(cycles).to.equal([
        {
          startDate: '2014-06-01',
          endDate: '2014-10-31',
          isCurrent: false
        },
        {
          startDate: '2014-11-01',
          endDate: '2015-05-31',
          isCurrent: false
        },
        {
          startDate: '2015-06-01',
          endDate: '2015-10-31',
          isCurrent: true
        },
        {
          startDate: '2015-11-01',
          endDate: '2016-07-01',
          isCurrent: true
        }])
    })
  })

  experiment('.getStatus', () => {
    test('returns completed if received date set in NALD', async () => {
      expect(TransformReturnsHelpers.getStatus('2018-03-31')).to.equal('completed')
    })
    test('returns due if no received date set in NALD', async () => {
      expect(TransformReturnsHelpers.getStatus(null)).to.equal('due')
    })
  })

  experiment('.mapPeriod', () => {
    test('Test mapping of NALD returns periods codes', async () => {
      expect(TransformReturnsHelpers.mapPeriod('D')).to.equal('day')
      expect(TransformReturnsHelpers.mapPeriod('W')).to.equal('week')
      expect(TransformReturnsHelpers.mapPeriod('F')).to.equal('week')
      expect(TransformReturnsHelpers.mapPeriod('M')).to.equal('month')
      expect(TransformReturnsHelpers.mapPeriod('Q')).to.equal('month')
      expect(TransformReturnsHelpers.mapPeriod('A')).to.equal('month')
      expect(TransformReturnsHelpers.mapPeriod('x')).to.equal(undefined)
    })
  })

  experiment('.mapProductionMonth', () => {
    experiment('when production month is "45"', () => {
      test('returns "isSummer" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(45)

        expect(result.isSummer).to.be.true()
      })

      test('returns "isUpload" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(45)

        expect(result.isUpload).to.be.false()
      })

      test('returns "isLineEntry" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(45)

        expect(result.isLineEntry).to.be.true()
      })

      test('returns "formProduced" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(45)

        expect(result.formProduced).to.be.false()
      })
    })

    experiment('when production month is "46"', () => {
      test('returns "isSummer" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(46)

        expect(result.isSummer).to.be.false()
      })

      test('returns "isUpload" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(46)

        expect(result.isUpload).to.be.false()
      })

      test('returns "isLineEntry" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(46)

        expect(result.isLineEntry).to.be.true()
      })

      test('returns "formProduced" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(46)

        expect(result.formProduced).to.be.false()
      })
    })

    experiment('when production month is "65"', () => {
      test('returns "isSummer" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(65)

        expect(result.isSummer).to.be.true()
      })

      test('returns "isUpload" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(65)

        expect(result.isUpload).to.be.true()
      })

      test('returns "isLineEntry" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(65)

        expect(result.isLineEntry).to.be.false()
      })

      test('returns "formProduced" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(65)

        expect(result.formProduced).to.be.false()
      })
    })

    experiment('when production month is "70"', () => {
      test('returns "isSummer" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(70)

        expect(result.isSummer).to.be.false()
      })

      test('returns "isUpload" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(70)

        expect(result.isUpload).to.be.false()
      })

      test('returns "isLineEntry" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(70)

        expect(result.isLineEntry).to.be.false()
      })

      test('returns "formProduced" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(70)

        expect(result.formProduced).to.be.true()
      })
    })

    experiment('when production month is "80"', () => {
      test('returns "isSummer" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(80)

        expect(result.isSummer).to.be.true()
      })

      test('returns "isUpload" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(80)

        expect(result.isUpload).to.be.false()
      })

      test('returns "isLineEntry" false', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(80)

        expect(result.isLineEntry).to.be.false()
      })

      test('returns "formProduced" true', () => {
        const result = TransformReturnsHelpers.mapProductionMonth(80)

        expect(result.formProduced).to.be.true()
      })
    })
  })

  experiment('.mapReceivedDate', () => {
    test('with no logs', async () => {
      const logs = []
      expect(TransformReturnsHelpers.mapReceivedDate(logs)).to.equal(null)
    })

    test('with a null value', async () => {
      const logs = [{ received_date: '01/01/2017' }, { received_date: null }]
      expect(TransformReturnsHelpers.mapReceivedDate(logs)).to.equal(null)
    })

    test('with valid dates', async () => {
      const logs = [{ received_date: '04/01/2017' }, { received_date: '25/12/2017' }]
      expect(TransformReturnsHelpers.mapReceivedDate(logs)).to.equal('25/12/2017')
    })
  })

  experiment('.mapSentDate', () => {
    test('with no logs', async () => {
      const logs = []
      expect(TransformReturnsHelpers.mapSentDate(logs)).to.equal(null)
    })

    test('with a null value', async () => {
      const logs = [{ sent_date: '01/01/2017' }, { sent_date: null }]
      expect(TransformReturnsHelpers.mapSentDate(logs)).to.equal(null)
    })

    test('with valid dates', async () => {
      const logs = [{ sent_date: '04/01/2017' }, { sent_date: '25/12/2017' }]
      expect(TransformReturnsHelpers.mapSentDate(logs)).to.equal('25/12/2017')
    })
  })
})
