'use strict'

const { beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const moment = require('moment')
moment.locale('en-gb')

const transformReturnHelpers = require('../../../../src/modules/return-logs/lib/transform-returns-helpers.js')

experiment('modules/return-logs/lib/transform-return-helpers', () => {
  experiment('.mapPeriod', () => {
    test('Test mapping of NALD returns periods codes', async () => {
      expect(transformReturnHelpers.mapPeriod('D')).to.equal('day')
      expect(transformReturnHelpers.mapPeriod('W')).to.equal('week')
      expect(transformReturnHelpers.mapPeriod('M')).to.equal('month')
      expect(transformReturnHelpers.mapPeriod('Q')).to.equal('quarter')
      expect(transformReturnHelpers.mapPeriod('A')).to.equal('year')
      expect(transformReturnHelpers.mapPeriod('x')).to.equal(undefined)
    })
  })

  experiment('.mapReceivedDate', () => {
    test('with no logs', async () => {
      const logs = []
      expect(transformReturnHelpers.mapReceivedDate(logs)).to.equal(null)
    })

    test('with a null string value', async () => {
      const logs = [{ RECD_DATE: '01/01/2017' }, { RECD_DATE: 'null' }]
      expect(transformReturnHelpers.mapReceivedDate(logs)).to.equal(null)
    })

    test('with valid dates', async () => {
      const logs = [{ RECD_DATE: '25/12/2017' }, { RECD_DATE: '04/01/2017' }]
      expect(transformReturnHelpers.mapReceivedDate(logs)).to.equal('2017-12-25')
    })
  })

  experiment('.addDate', () => {
    test('add a date if within range', async () => {
      expect(transformReturnHelpers.addDate([], '2018-12-01', '2018-01-01', '2018-12-31')).to.equal(['2018-12-01'])
    })
    test('dont add a date if before start date', async () => {
      expect(transformReturnHelpers.addDate([], '2017-12-01', '2018-01-01', '2018-12-31')).to.equal([])
    })
    test('dont add a date if after end date', async () => {
      expect(transformReturnHelpers.addDate([], '2018-12-05', '2018-01-01', '2018-11-31')).to.equal([])
    })
    test('dont add a date if on start date', async () => {
      expect(transformReturnHelpers.addDate([], '2017-12-01', '2017-12-01', '2018-12-31')).to.equal([])
    })
    test('dont add a date if on end date', async () => {
      expect(transformReturnHelpers.addDate([], '2018-11-31', '2018-01-01', '2018-11-31')).to.equal([])
    })
    test('dont add duplicate dates', async () => {
      let dates = []
      dates = transformReturnHelpers.addDate(dates, '2018-12-01', '2018-01-01', '2018-12-31')
      dates = transformReturnHelpers.addDate(dates, '2018-12-01', '2018-01-01', '2018-12-31')
      expect(dates).to.equal(['2018-12-01'])
    })
  })

  experiment('.getReturnCycles', () => {
    test('getReturnCycles - single financial year, current version', async () => {
      const cycles = transformReturnHelpers.getReturnCycles('2014-04-01', '2015-03-31', '2014-04-01', false)
      expect(cycles).to.equal([{
        startDate: '2014-04-01',
        endDate: '2015-03-31',
        isCurrent: true
      }])
    })
    test('getReturnCycles - single financial year, expired version', async () => {
      const cycles = transformReturnHelpers.getReturnCycles('2014-04-01', '2015-03-31', '2016-04-01', false)
      expect(cycles).to.equal([{
        startDate: '2014-04-01',
        endDate: '2015-03-31',
        isCurrent: false
      }])
    })
    test('getReturnCycles - part financial years, current version', async () => {
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2010-04-01', false)
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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2018-04-01', false)
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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2015-04-01', false)
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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2015-06-01', false)
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
      const cycles = transformReturnHelpers.getReturnCycles('2014-11-01', '2015-10-31', '2014-11-01', true)
      expect(cycles).to.equal([{
        startDate: '2014-11-01',
        endDate: '2015-10-31',
        isCurrent: true
      }])
    })
    test('getReturnCycles - single summer year, expired version', async () => {
      const cycles = transformReturnHelpers.getReturnCycles('2014-11-01', '2015-10-31', '2016-04-01', true)
      expect(cycles).to.equal([{
        startDate: '2014-11-01',
        endDate: '2015-10-31',
        isCurrent: false
      }])
    })
    test('getReturnCycles - part summer years, current version', async () => {
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-12-01', '2010-04-01', true)
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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2015-07-01', '2018-04-01', true)

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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2016-07-01', '2015-11-01', true)

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
      const cycles = transformReturnHelpers.getReturnCycles('2014-06-01', '2016-07-01', '2015-06-01', true)

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
      expect(transformReturnHelpers.getStatus('2018-03-31')).to.equal('completed')
    })
    test('returns due if no received date set in NALD', async () => {
      expect(transformReturnHelpers.getStatus(null)).to.equal('due')
    })
  })

  experiment('.getFormatStartDate', () => {
    test('It should return version start date when time limited date is null', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: 'null'
      }
      expect(transformReturnHelpers.getFormatStartDate(format)).to.equal('2017-05-03')
    })

    test('It should return version start date if after time limited start date', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: '01/05/2016'
      }
      expect(transformReturnHelpers.getFormatStartDate(format)).to.equal('2017-05-03')
    })

    test('It should return time limited start date if after version start date', async () => {
      const format = {
        EFF_ST_DATE: '03/05/2017',
        TIMELTD_ST_DATE: '04/12/2017'
      }
      expect(transformReturnHelpers.getFormatStartDate(format)).to.equal('2017-12-04')
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
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal(null)
    })

    test('returns effective end date if time limited date is null', async () => {
      const format = {
        EFF_END_DATE: '22/02/2014',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2014-02-22')
    })

    test('returns effective end date if time limited date is after effective end date', async () => {
      const format = {
        EFF_END_DATE: '22/02/2014',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2014-02-22')
    })

    test('returns time limited end date if effective end date is null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2014-02-23')
    })
    test('returns time limited end date if before effective end date', async () => {
      const format = {
        EFF_END_DATE: '25/04/2015',
        TIMELTD_END_DATE: '23/02/2014',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: 'null'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2014-02-23')
    })

    test('returns the licence expiry date is not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '01/01/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the licence revocation date is not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '02/02/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-02-02')
    })

    test('returns the licence lapsed date if not null', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_LAPSED_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_EXPIRY_DATE: '01/01/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the earliest date of licence has multiple dates', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: '01/01/2018',
        LICENCE_LAPSED_DATE: '02/02/2018',
        LICENCE_EXPIRY_DATE: '03/03/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns time limited end date if before the licence dates', async () => {
      const format = {
        EFF_END_DATE: 'null',
        TIMELTD_END_DATE: '01/01/2018',
        LICENCE_REVOKED_DATE: '02/02/2018',
        LICENCE_LAPSED_DATE: '03/03/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns effective end date if before the licence dates', async () => {
      const format = {
        EFF_END_DATE: '01/01/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: '02/02/2018',
        LICENCE_LAPSED_DATE: '03/03/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
    })

    test('returns the licence lapsed date if before effective end date', async () => {
      const format = {
        EFF_END_DATE: '02/02/2018',
        TIMELTD_END_DATE: 'null',
        LICENCE_REVOKED_DATE: 'null',
        LICENCE_LAPSED_DATE: '01/01/2018',
        LICENCE_EXPIRY_DATE: '04/04/2018'
      }
      expect(transformReturnHelpers.getFormatEndDate(format)).to.equal('2018-01-01')
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
      const cycles = transformReturnHelpers.getFormatCycles(format, '2014-04-01')

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
      const cycles = transformReturnHelpers.getFormatCycles(format, '2014-04-01')

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
      const cycles = transformReturnHelpers.getFormatCycles(format, '2017-06-01')

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
      const cycles = transformReturnHelpers.getFormatCycles(format, '2014-04-01')

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

      const cycles = transformReturnHelpers.getFormatCycles(format, '2014-04-01')

      expect(cycles).to.equal([
        { startDate: '2016-05-23', endDate: '2016-10-31', isCurrent: true },
        { startDate: '2016-11-01', endDate: '2017-01-01', isCurrent: true }
      ])
    })
  })

  experiment('.formatReturnMetadata', () => {
    let metadata

    const getPurpose = alias => ({
      APUR_APPR_CODE: 'W',
      APUR_APSE_CODE: 'WAT',
      APUR_APUS_CODE: '180',
      PURP_ALIAS: alias,
      primary_purpose: 'primary',
      secondary_purpose: 'secondary',
      tertiary_purpose: 'tertiary'
    })

    const formatData = {
      TPT_FLAG: 'N',
      AREP_AREA_CODE: 'KAEA',
      FORM_PRODN_MONTH: '65',
      purposes: [
        getPurpose('Water alias'),
        getPurpose('Agri alias'),
        getPurpose('null'),
        getPurpose('Null'),
        getPurpose('NULL'),
        getPurpose(' null ')
      ],
      points: []
    }

    beforeEach(async () => {
      metadata = transformReturnHelpers.formatReturnMetadata(formatData)
    })

    test('the purposes contain the alias', async () => {
      expect(metadata.purposes[0].alias).to.equal('Water alias')
      expect(metadata.purposes[1].alias).to.equal('Agri alias')
    })

    test('null aliases are ignored', async () => {
      expect(metadata.purposes[2].alias).to.be.undefined()
      expect(metadata.purposes[3].alias).to.be.undefined()
      expect(metadata.purposes[4].alias).to.be.undefined()
      expect(metadata.purposes[5].alias).to.be.undefined()
    })

    test('the area code is added to the metadata', async () => {
      expect(metadata.nald.areaCode).to.equal('KAEA')
    })

    test('adds an isTwoPartTariff flag', async () => {
      expect(metadata.isTwoPartTariff).to.be.false()
    })

    test('adds an isSummer flag', async () => {
      expect(metadata.isSummer).to.be.true()
    })

    experiment('isUpload flag', () => {
      const createFormat = month => transformReturnHelpers.formatReturnMetadata({
        ...metadata,
        FORM_PRODN_MONTH: month
      })

      test('sets isUpload true for form production month 45', async () => {
        const data = createFormat(45)
        expect(data.isUpload).to.equal(true)
      })

      test('sets isUpload true for form production month 46', async () => {
        const data = createFormat(46)
        expect(data.isUpload).to.equal(true)
      })

      test('sets isUpload true for form production month 65', async () => {
        const data = createFormat(65)
        expect(data.isUpload).to.equal(true)
      })

      test('sets isUpload true for form production month 66', async () => {
        const data = createFormat(66)
        expect(data.isUpload).to.equal(true)
      })

      test('sets isUpload false for other months', async () => {
        const data = createFormat(67)
        expect(data.isUpload).to.equal(false)
      })
    })
  })
})
