'use strict'

const cron = require('node-cron')
const importTrackerJob = require('./jobs/import-tracker')

const config = require('../../../config')

const registerSubscribers = async server => {
  await server.messageQueue.subscribe(importTrackerJob.jobName, importTrackerJob.handler)

  // If we're not running the unit tests, schedule the import tracker job
  if (process.env.NODE_ENV !== 'test') {
    cron.schedule(config.import.tracker.schedule, async () => {
      await server.messageQueue.publish(importTrackerJob.createMessage())
    })
  }
}

const plugin = {
  name: 'importTracker',
  dependencies: ['pgBoss'],
  register: registerSubscribers
}

module.exports = {
  plugin
}
