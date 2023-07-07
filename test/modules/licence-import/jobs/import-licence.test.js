'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const extract = require('../../../../src/modules/licence-import/extract/index.js')
const load = require('../../../../src/modules/licence-import/load/index.js')
const transform = require('../../../../src/modules/licence-import/transform/index.js')

// Thing under test
const ImportLicenceJob = require('../../../../src/modules/licence-import/jobs/import-licence.js')

experiment('Licence Import: Import Licence job', () => {
  const licenceNumber = '01/123'

  let notifierStub

  beforeEach(async () => {
    Sinon.stub(extract, 'getLicenceData').resolves()
    Sinon.stub(transform.licence, 'transformLicence')
    Sinon.stub(load.licence, 'loadLicence').resolves()

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
      const data = { licenceNumber, jobNumber: 1, numberOfJobs: 1 }
      const message = ImportLicenceJob.createMessage(data)

      expect(message).to.equal({
        name: 'licence-import.import-licence',
        data: {
          ...data
        },
        options: {
          singletonKey: 'licence-import.import-licence.01/123'
        }
      })
    })
  })

  experiment('.handler', () => {
    let job

    experiment('when the job is successful', () => {
      experiment('and this is the first licence to be imported', () => {
        beforeEach(() => {
          job = {
            data: { licenceNumber: '01/123', jobNumber: 1, numberOfJobs: 10 }
          }
        })

        test("a 'started' message is logged", async () => {
          await ImportLicenceJob.handler(job)

          const [message] = notifierStub.omg.lastCall.args

          expect(message).to.equal('licence-import.import-licence: started')
          expect(notifierStub.omg.called).to.be.true()
        })

        test('extracts the licence data, transforms it then loads it into the DB', async () => {
          await ImportLicenceJob.handler(job)

          expect(extract.getLicenceData.called).to.equal(true)
          expect(transform.licence.transformLicence.called).to.equal(true)
          expect(load.licence.loadLicence.called).to.equal(true)
        })
      })

      experiment('and this is one of a number of licences to be imported', () => {
        beforeEach(() => {
          job = {
            data: { licenceNumber: '01/123', jobNumber: 2, numberOfJobs: 10 }
          }
        })

        test('a message is NOT logged', async () => {
          await ImportLicenceJob.handler(job)

          expect(notifierStub.omg.called).to.be.false()
        })

        test('extracts the licence data, transforms it then loads it into the DB', async () => {
          await ImportLicenceJob.handler(job)

          expect(extract.getLicenceData.called).to.equal(true)
          expect(transform.licence.transformLicence.called).to.equal(true)
          expect(load.licence.loadLicence.called).to.equal(true)
        })
      })

      experiment('and this is the last licence to be imported', () => {
        beforeEach(() => {
          job = {
            data: { licenceNumber: '01/123', jobNumber: 10, numberOfJobs: 10 }
          }
        })

        test("a 'finished' message is logged", async () => {
          await ImportLicenceJob.handler(job)

          const [message] = notifierStub.omg.lastCall.args
          expect(message).to.equal('licence-import.import-licence: finished')

          expect(notifierStub.omg.called).to.be.true()
        })

        test('extracts the licence data, transforms it then loads it into the DB', async () => {
          await ImportLicenceJob.handler(job)

          expect(extract.getLicenceData.called).to.equal(true)
          expect(transform.licence.transformLicence.called).to.equal(true)
          expect(load.licence.loadLicence.called).to.equal(true)
        })
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        extract.getLicenceData.throws(err)
      })

      test('logs an error message', async () => {
        await expect(ImportLicenceJob.handler(job)).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.import-licence: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(ImportLicenceJob.handler(job)).to.reject()

        expect(err.message).to.equal('Oops!')
      })
    })
  })
})
