'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = (exports.lab = Lab.script())
const { expect } = Code

// Thing under test
const GeneralLib = require('../../src/lib/general.js')

experiment('src/lib/general.js', () => {
  afterEach(() => {
    Sinon.restore()
  })

  experiment('#calculateAndLogTimeTaken', () => {
    let notifierStub
    let startTime

    beforeEach(() => {
      startTime = GeneralLib.currentTimeInNanoseconds()

      // BaseRequest depends on the GlobalNotifier to have been set. This happens in
      // app/plugins/global-notifier.plugin.js when the app starts up and the plugin is registered. As we're not
      // creating an instance of Hapi server in this test we recreate the condition by setting it directly with our own
      // stub
      notifierStub = { omg: Sinon.stub(), omfg: Sinon.stub() }
      global.GlobalNotifier = notifierStub
    })

    experiment('when no additional data is provided', () => {
      test('logs the message and time taken in milliseconds and seconds', () => {
        GeneralLib.calculateAndLogTimeTaken(startTime, 'I am the test with no data')

        const logDataArg = notifierStub.omg.args[0][1]

        expect(notifierStub.omg.calledWith('I am the test with no data')).to.be.true()
        expect(logDataArg.timeTakenMs).to.exist()
        expect(logDataArg.timeTakenSs).to.exist()
        expect(logDataArg.name).not.to.exist()
      })
    })

    experiment('when additional data is provided', () => {
      test('logs the message and time taken in milliseconds and seconds as well as the additional data', () => {
        GeneralLib.calculateAndLogTimeTaken(startTime, 'I am the test with data', { name: 'Foo Bar' })

        const logDataArg = notifierStub.omg.args[0][1]

        expect(notifierStub.omg.calledWith('I am the test with data')).to.be.true()
        expect(logDataArg.timeTakenMs).to.exist()
        expect(logDataArg.name).to.exist()
      })
    })
  })

  experiment('#currentTimeInNanoseconds', () => {
    let timeBeforeTest

    beforeEach(() => {
      timeBeforeTest = process.hrtime.bigint()
    })

    test('returns the current date and time as an ISO string', () => {
      const result = GeneralLib.currentTimeInNanoseconds()

      expect(typeof result).to.equal('bigint')
      expect(result).to.be.greaterThan(timeBeforeTest)
    })
  })

  experiment('#determineCurrentFinancialYear', () => {
    let clock
    let testDate

    afterEach(() => {
      clock.restore()
    })

    experiment('when the current financial year is 2023 to 2024', () => {
      experiment('and the current date is between April and December', () => {
        beforeEach(() => {
          testDate = new Date(2023, 7, 21, 20, 31, 57)

          clock = Sinon.useFakeTimers(testDate)
        })

        test('returns the correct start and end dates for the financial year', () => {
          const result = GeneralLib.determineCurrentFinancialYear()

          expect(result.startDate).to.equal(new Date('2023-04-01'))
          expect(result.endDate).to.equal(new Date('2024-03-31'))
        })
      })

      experiment('and the current date is between January and March', () => {
        beforeEach(() => {
          testDate = new Date(2024, 2, 21, 20, 31, 57)

          clock = Sinon.useFakeTimers(testDate)
        })

        test('returns the correct start and end dates for the financial year', () => {
          const result = GeneralLib.determineCurrentFinancialYear()

          expect(result.startDate).to.equal(new Date('2023-04-01'))
          expect(result.endDate).to.equal(new Date('2024-03-31'))
        })
      })
    })
  })

  experiment('#formatLongDateTime()', () => {
    test('correctly formats the given date, for example, 12 September 2021 at 14:41:10', async () => {
      const result = GeneralLib.formatLongDateTime(new Date('2021-09-12T14:41:10.511Z'))

      expect(result).to.equal('12 September 2021 at 14:41:10')
    })
  })

  experiment('#generateUUID', () => {
    // NOTE: generateUUID() only calls crypto.randomUUID(); it does nothing else. So, there is nothing really to test
    // and certainly, testing the UUID is really unique is beyond the scope of this project! But this test at least
    // serves as documentation and means no one will get confused by the lack of a test :-)
    test('returns a Universally unique identifier (UUID)', () => {
      const uuid1 = GeneralLib.generateUUID()
      const uuid2 = GeneralLib.generateUUID()
      const uuid3 = GeneralLib.generateUUID()

      expect(uuid1).not.to.equal(uuid2)
      expect(uuid1).not.to.equal(uuid3)
      expect(uuid2).not.to.equal(uuid3)
    })
  })

  experiment('#naldNull', () => {
    experiment("when the value is a NALD null ('null')", () => {
      test('returns null', () => {
        const result = GeneralLib.naldNull('null')

        expect(result).to.be.null()
      })
    })

    experiment('when the value is actually null', () => {
      test('returns null', () => {
        const result = GeneralLib.naldNull('null')

        expect(result).to.be.null()
      })
    })

    experiment('when the value is not null', () => {
      test('returns the value unchanged', () => {
        const result = GeneralLib.naldNull('foo')

        expect(result).to.equal('foo')
      })
    })
  })

  experiment('#timestampForPostgres', () => {
    let clock
    let testDate

    beforeEach(() => {
      testDate = new Date(2015, 9, 21, 20, 31, 57)

      clock = Sinon.useFakeTimers(testDate)
    })

    afterEach(() => {
      clock.restore()
    })

    test('returns the current date and time as an ISO string', () => {
      const result = GeneralLib.timestampForPostgres()

      expect(result).to.equal('2015-10-21T20:31:57.000Z')
    })
  })
})
