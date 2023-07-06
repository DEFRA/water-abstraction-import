'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const importService = require('../../../../src/lib/services/import')
const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist')

// Thing under test
const QueueLicencesJob = require('../../../../src/modules/nald-import/jobs/queue-licences.js')

experiment('NALD Import: Queue Licences job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(assertImportTablesExist, 'assertImportTablesExist')
    Sinon.stub(importService, 'getLicenceNumbers').resolves([
      'licence-1-id',
      'licence-2-id'
    ])

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

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const message = QueueLicencesJob.createMessage()

      expect(message).to.equal({
        name: 'nald-import.queue-licences',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.queue-licences'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await QueueLicencesJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.queue-licences: started')
      })

      test('asserts that the import tables exist', async () => {
        await QueueLicencesJob.handler()

        expect(assertImportTablesExist.assertImportTablesExist.called).to.be.true()
      })

      test('retrieves the licence numbers', async () => {
        await QueueLicencesJob.handler()

        expect(importService.getLicenceNumbers.called).to.be.true()
      })

      test('resolves with an array of licence numbers to import', async () => {
        const result = await QueueLicencesJob.handler()

        expect(result).to.equal({
          licenceNumbers: [
            'licence-1-id',
            'licence-2-id'
          ]
        })
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        assertImportTablesExist.assertImportTablesExist.throws(err)
      })

      test('logs an error message', async () => {
        await expect(QueueLicencesJob.handler()).to.reject()
        expect(notifierStub.omfg.calledWith(
          'nald-import.queue-licences: errored', err
        )).to.be.true()
      })

      test('rethrows the error', async () => {
        const err = await expect(QueueLicencesJob.handler()).to.reject()

        expect(err.message).to.equal('Oops!')
      })
    })
  })

  experiment('.onComplete', () => {
    let job
    let messageQueue

    beforeEach(async () => {
      messageQueue = {
        publish: Sinon.stub()
      }
    })

    experiment('when the job succeeds', () => {
      beforeEach(async () => {
        job = {
          failed: false,
          data: {
            response: {
              licenceNumbers: [
                'licence-1',
                'licence-2'
              ]
            }
          }
        }
      })

      test('a message is logged', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.queue-licences: finished')
      })

      test('the import licence job is published to the queue for the first licence', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.firstCall.args[0]

        expect(jobMessage.data).to.equal({ licenceNumber: 'licence-1', jobNumber: 1, numberOfLicences: 2 })
      })

      test('the import licence job is published to the queue for the second licence', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.data).to.equal({ licenceNumber: 'licence-2', jobNumber: 2, numberOfLicences: 2 })
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('an error message is thrown', async () => {
          const error = await expect(QueueLicencesJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(err)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = {
          failed: true,
          data: {
            response: {
              licenceNumbers: [
                'licence-1',
                'licence-2'
              ]
            }
          }
        }
      })

      test('a message is logged', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('nald-import.queue-licences: finished')
      })

      test('no further jobs are published', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
