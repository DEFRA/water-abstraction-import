'use strict'

const cron = require('node-cron')
const importTrackerJob = require('./jobs/import-tracker')

const config = require('../../../config')

const getSchedule = () => config.isProduction ? '0 10 * * 1,2,3,4,5' : '0 15 * * 1,2,3,4,5'

const registerSubscribers = async server => {
  await server.messageQueue.subscribe(importTrackerJob.jobName, importTrackerJob.handler)

  // If we're not running the unit tests, schedule the import tracker job
  if (process.env.NODE_ENV !== 'test') {
    cron.schedule(getSchedule(), async () => {
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
