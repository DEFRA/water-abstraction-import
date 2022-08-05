'use strict'

require('dotenv').config()

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const sandbox = require('sinon').createSandbox()
const cron = require('node-cron')

const config = require('../../../config')

const { plugin } = require('../../../src/modules/charging-import/plugin')

const chargingDataJob = require('../../../src/modules/charging-import/jobs/charging-data')

const { expect } = require('@hapi/code')

experiment('modules/charging-import/plugin.js', () => {
  let server

  beforeEach(async () => {
    server = {
      messageQueue: {
        subscribe: sandbox.stub().resolves(),
        publish: sandbox.stub().resolves(),
        onComplete: sandbox.stub().resolves()
      }
    }
    sandbox.stub(cron, 'schedule')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  test('has a plugin name', async () => {
    expect(plugin.name).to.equal('importChargingData')
  })

  test('requires pgBoss plugin', async () => {
    expect(plugin.dependencies).to.equal(['pgBoss'])
  })

  experiment('register', () => {
    experiment('on target environments', () => {
      beforeEach(async () => {
        sandbox.stub(process, 'env').value({
          NODE_ENV: 'dev'
        })
        sandbox.stub(config.import.charging, 'schedule').value('0 14 * * 1,2,3,4,5')
        await plugin.register(server)
      })

      test('adds subscriber for import charging data job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          chargingDataJob.jobName, chargingDataJob.handler
        )).to.be.true()
      })

      test('adds subscriber for import charge versions job', async () => {
        expect(server.messageQueue.subscribe.calledWith(
          chargingDataJob.jobName, chargingDataJob.handler
        )).to.be.true()
      })

      test('schedules a cron job at 2pm on weekdays on non-prod environments to run the charging import', async () => {
        const [schedule, func] = cron.schedule.firstCall.args
        expect(schedule).to.equal('0 14 * * 1,2,3,4,5')
        func()
        const [{ name }] = server.messageQueue.publish.lastCall.args
        expect(name).to.equal('import.charging-data')
      })
    })

    experiment('on production', () => {
      beforeEach(async () => {
        sandbox.stub(process.env, 'NODE_ENV').value('production')
        await plugin.register(server)
      })

      test('2 subscribers are bound', async () => {
        expect(server.messageQueue.subscribe.callCount).to.equal(2)
      })

      test('1 cron job is scheduled', async () => {
        expect(cron.schedule.callCount).to.equal(1)
      })
    })
  })
})
