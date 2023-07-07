'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const extract = require('../../../../src/modules/licence-import/extract/index.js')

// Thing under test
const QueueLicencesJob = require('../../../../src/modules/licence-import/jobs/queue-licences.js')

experiment('Licence Import: Queue Licences job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(extract, 'getAllLicenceNumbers').resolves([
      { LIC_NO: '01/123' },
      { LIC_NO: '01/124' }
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
        name: 'licence-import.queue-licences',
        options: {
          singletonKey: 'licence-import.queue-licences',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await QueueLicencesJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.queue-licences: started')
      })

      test('retrieves the licences to import', async () => {
        await QueueLicencesJob.handler()

        expect(extract.getAllLicenceNumbers.called).to.equal(true)
      })

      test('resolves with an array of licences to import', async () => {
        const result = await QueueLicencesJob.handler()

        expect(result).to.equal([
          { LIC_NO: '01/123' },
          { LIC_NO: '01/124' }
        ])
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        extract.getAllLicenceNumbers.throws(err)
      })

      test('logs an error message', async () => {
        await expect(QueueLicencesJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.queue-licences: errored', err
        )).to.equal(true)
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
              value: [
                { LIC_NO: '01/123' },
                { LIC_NO: '01/124' }
              ]
            }
          }
        }
      })

      test('a message is logged', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.queue-licences: finished')
      })

      test('the import licence job is published to the queue for the first licence', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.firstCall.args[0]

        expect(jobMessage.data).to.equal({ licenceNumber: '01/123', jobNumber: 1, numberOfJobs: 2 })
      })

      test('the import licence job is published to the queue for the second licence', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.data).to.equal({ licenceNumber: '01/124', jobNumber: 2, numberOfJobs: 2 })
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(QueueLicencesJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await QueueLicencesJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
