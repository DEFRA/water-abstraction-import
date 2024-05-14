'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const licenceLoader = require('../../../../src/modules/nald-import/load')

// Thing under test
const ImportLicenceJob = require('../../../../src/modules/nald-import/jobs/import-licence')

experiment('NALD Import: Import Licence job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(licenceLoader, 'load')

    // RequestLib depends on the GlobalNotifier to have been set. This happens in app/plugins/global-notifier.plugin.js
    // when the app starts up and the plugin is registered. As we're not creating an instance of Hapi server in this
    // test we recreate the condition by setting it directly with our own stub
    notifierStub = { omg: Sinon.stub(), omfg: Sinon.stub() }
    global.GlobalNotifier = notifierStub
  })

  afterEach(async () => {
    Sinon.restore()
    delete global.GlobalNotifier
  })

  experiment('.options', () => {
    test('has teamSize set to 75', async () => {
      expect(ImportLicenceJob.options.teamSize).to.equal(75)
    })

    test('has teamConcurrency set to 1', async () => {
      expect(ImportLicenceJob.options.teamConcurrency).to.equal(1)
    })
  })

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const data = { licenceNumber: 'test-licence-number', jobNumber: 1, numberOfJobs: 1 }
      const job = ImportLicenceJob.createMessage(data)

      expect(job).to.equal({
        data: {
          ...data
        },
        name: 'nald-import.import-licence',
        options: { singletonKey: 'test-licence-number' }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the licence import was successful', () => {
      let job

      experiment('and this is the first licence to be imported', () => {
        beforeEach(async () => {
          job = {
            data: { licenceNumber: 'test-licence-number', jobNumber: 1, numberOfJobs: 10 }
          }
        })

        test("a 'started' message is logged", async () => {
          await ImportLicenceJob.handler(job)

          const [message] = notifierStub.omg.lastCall.args

          expect(message).to.equal('nald-import.import-licence: started')
          expect(notifierStub.omg.called).to.be.true()
        })

        test('loads the requested licence', async () => {
          await ImportLicenceJob.handler(job)

          expect(licenceLoader.load.calledWith('test-licence-number')).to.be.true()
        })
      })

      experiment('and this is one of a number of licences to be imported', () => {
        beforeEach(async () => {
          job = {
            data: { licenceNumber: 'test-licence-number', jobNumber: 2, numberOfJobs: 10 }
          }
        })

        test('a message is NOT logged', async () => {
          await ImportLicenceJob.handler(job)

          expect(notifierStub.omg.called).to.be.false()
        })

        test('loads the requested licence', async () => {
          await ImportLicenceJob.handler(job)

          expect(licenceLoader.load.calledWith('test-licence-number')).to.be.true()
        })
      })

      experiment('and this is the last licence to be imported', () => {
        beforeEach(async () => {
          job = {
            data: { licenceNumber: 'test-licence-number', jobNumber: 10, numberOfJobs: 10 }
          }
        })

        test("a 'finished' message is logged", async () => {
          await ImportLicenceJob.handler(job)

          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('nald-import.import-licence: finished')

          expect(notifierStub.omg.called).to.be.true()
        })

        test('loads the requested licence', async () => {
          await ImportLicenceJob.handler(job)

          expect(licenceLoader.load.calledWith('test-licence-number')).to.be.true()
        })
      })
    })

    experiment('when the licence import fails', () => {
      const err = new Error('Oops!')

      const job = {
        name: 'nald-import.import-licence',
        data: { licenceNumber: 'test-licence-number', jobNumber: 2, numberOfJobs: 10 }
      }

      beforeEach(async () => {
        licenceLoader.load.throws(err)
      })

      test('logs an error message', async () => {
        await expect(ImportLicenceJob.handler(job)).to.reject()

        expect(notifierStub.omfg.calledWith(
          'nald-import.import-licence: errored',
          err,
          job.data
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const err = await expect(ImportLicenceJob.handler(job)).to.reject()
        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
