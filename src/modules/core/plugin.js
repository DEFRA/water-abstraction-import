'use strict'

const importTrackerJob = require('./jobs/import-tracker')

const registerSubscribers = async server => {
  await server.messageQueue.subscribe(importTrackerJob.jobName, importTrackerJob.handler)
}

const plugin = {
  name: 'importTracker',
  register: registerSubscribers
}

module.exports = {
  plugin
}
