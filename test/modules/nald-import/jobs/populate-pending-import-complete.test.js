'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const PopulatePendingImportComplete = require('../../../../src/modules/nald-import/jobs/populate-pending-import-complete')

const createJob = failed => ({
  failed,
  data: {
    response: {
      licenceNumbers: [
        'licence-1',
        'licence-2'
      ]
    },
    request: {
      name: 'nald-import.populate-pending-import'
    }
  }
})

experiment('modules/nald-import/jobs/populate-pending-import-complete', () => {
  let messageQueue
  let notifierStub

  beforeEach(async () => {
    messageQueue = {
      publish: Sinon.stub()
    }

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

  experiment('.handler', () => {
    experiment('when the job succeeds', () => {
      const job = createJob(false)

      beforeEach(async () => {
        await PopulatePendingImportComplete.handler(messageQueue, job)
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.populate-pending-import: finished')
      })

      test('a job is published to import the first licence', async () => {
        const [job] = messageQueue.publish.firstCall.args
        expect(job.data).to.equal({ licenceNumber: 'licence-1', jobNumber: 1, numberOfLicences: 2 })
      })

      test('a job is published to import the second licence', async () => {
        const [job] = messageQueue.publish.lastCall.args
        expect(job.data).to.equal({ licenceNumber: 'licence-2', jobNumber: 2, numberOfLicences: 2 })
      })
    })

    experiment('when the job fails', () => {
      const job = createJob(true)

      beforeEach(async () => {
        await PopulatePendingImportComplete.handler(messageQueue, job)
      })

      test('a message is logged', async () => {
        const [message] = notifierStub.omg.lastCall.args
        expect(message).to.equal('nald-import.populate-pending-import: finished')
      })

      test('no further jobs are published', async () => {
        expect(messageQueue.publish.called).to.be.false()
      })
    })

    experiment('when publishing a new job fails', () => {
      const err = new Error('oops')

      const job = createJob(false)

      beforeEach(async () => {
        messageQueue.publish.rejects(err)
      })

      test('an error message is thrown', async () => {
        const func = () => PopulatePendingImportComplete.handler(messageQueue, job)
        const error = await expect(func()).to.reject()

        expect(error).to.equal(err)
      })
    })
  })
})
