'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Things we need to stub
const importCompanies = require('../../../../src/modules/licence-import/connectors/import-companies.js')

// Thing under test
const QueueCompaniesJob = require('../../../../src/modules/licence-import/jobs/queue-companies.js')

experiment('Licence Import: Queue Companies job', () => {
  let notifierStub

  beforeEach(async () => {
    Sinon.stub(importCompanies, 'clear').resolves()
    Sinon.stub(importCompanies, 'initialise').resolves([
      { region_code: 1, party_id: 37760 },
      { region_code: 1, party_id: 37761 }
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
      const message = QueueCompaniesJob.createMessage()

      expect(message).to.equal({
        name: 'licence-import.queue-companies',
        options: {
          singletonKey: 'licence-import.queue-companies',
          expireIn: '1 hours'
        }
      })
    })
  })

  experiment('.handler', () => {
    experiment('when the job is successful', () => {
      test('a message is logged', async () => {
        await QueueCompaniesJob.handler()

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.queue-companies: started')
      })

      test('clears the water_import.import_companies table', async () => {
        await QueueCompaniesJob.handler()

        expect(importCompanies.clear.called).to.equal(true)
      })

      test('retrieves the companies to import', async () => {
        await QueueCompaniesJob.handler()

        expect(importCompanies.initialise.called).to.equal(true)
      })

      test('resolves with an array of companies to import', async () => {
        const result = await QueueCompaniesJob.handler()

        expect(result).to.equal([
          { regionCode: 1, partyId: 37760 },
          { regionCode: 1, partyId: 37761 }
        ])
      })
    })

    experiment('when the job fails', () => {
      const err = new Error('Oops!')

      beforeEach(async () => {
        importCompanies.initialise.throws(err)
      })

      test('logs an error message', async () => {
        await expect(QueueCompaniesJob.handler()).to.reject()

        expect(notifierStub.omfg.calledWith(
          'licence-import.queue-companies: errored', err
        )).to.equal(true)
      })

      test('rethrows the error', async () => {
        const err = await expect(QueueCompaniesJob.handler()).to.reject()

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
                { regionCode: 1, partyId: 37760 },
                { regionCode: 1, partyId: 37761 }
              ]
            }
          }
        }
      })

      test('a message is logged', async () => {
        await QueueCompaniesJob.onComplete(messageQueue, job)

        const [message] = notifierStub.omg.lastCall.args

        expect(message).to.equal('licence-import.queue-companies: finished')
      })

      test('the import company job is published to the queue for the first company', async () => {
        await QueueCompaniesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.firstCall.args[0]

        expect(jobMessage.data).to.equal({ regionCode: 1, partyId: 37760, jobNumber: 1, numberOfJobs: 2 })
      })

      test('the import company job is published to the queue for the second company', async () => {
        await QueueCompaniesJob.onComplete(messageQueue, job)

        const jobMessage = messageQueue.publish.lastCall.args[0]

        expect(jobMessage.data).to.equal({ regionCode: 1, partyId: 37761, jobNumber: 2, numberOfJobs: 2 })
      })

      experiment('but an error is thrown', () => {
        const err = new Error('oops')

        beforeEach(async () => {
          messageQueue.publish.rejects(err)
        })

        test('rethrows the error', async () => {
          const error = await expect(QueueCompaniesJob.onComplete(messageQueue, job)).to.reject()

          expect(error).to.equal(error)
        })
      })
    })

    experiment('when the job fails', () => {
      beforeEach(async () => {
        job = { failed: true }
      })

      test('no further jobs are published', async () => {
        await QueueCompaniesJob.onComplete(messageQueue, job)

        expect(messageQueue.publish.called).to.be.false()
      })
    })
  })
})
