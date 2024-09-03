'use strict'

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const sandbox = require('sinon').createSandbox()

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
    })

    experiment('on production', () => {
      beforeEach(async () => {
        await plugin.register(server)
      })

      test('2 subscribers are bound', async () => {
        expect(server.messageQueue.subscribe.callCount).to.equal(2)
      })
    })
  })
})
