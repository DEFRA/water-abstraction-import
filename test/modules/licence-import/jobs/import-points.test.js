'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const { pool } = require('../../../../src/lib/connectors/db.js')

// Thing under test
const ImportPointsJob = require('../../../../src/modules/licence-import/jobs/import-points.js')

experiment('Licence Import: Import Points job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(pool, 'query').resolves()

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
    test('formats a message for the queue', async () => {
      const message = ImportPointsJob.createMessage()

      expect(message).to.equal({
        name: 'licence-import.import-points',
        options: {
          singletonKey: 'licence-import.import-points',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await ImportPointsJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.import-points: started')
      })

      test('import the points', async () => {
        await ImportPointsJob.handler()

        expect(pool.query.called).to.equal(true)
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        pool.query.rejects(err)
      })

      test('logs an error message', async () => {
        await expect(ImportPointsJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.import-points: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(ImportPointsJob.handler()).to.reject()

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
        job = { failed: false }
      })

      test('a message is logged', async () => {
        await ImportPointsJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.import-points: finished')
      })

      test('the trigger end date process job is published to the queue', async () => {
        await ImportPointsJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.name).to.equal('licence-import.trigger-end-date-process')
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(ImportPointsJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await ImportPointsJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
