'use strict'

const ImportPurposeConditionTypesJob = require('./import-purpose-condition-types.js')
const WaterSystemService = require('../../../lib/services/water-system-service.js')

const JOB_NAME = 'licence-import.trigger-end-date-process'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME,
      expireIn: '1 hours'
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await WaterSystemService.postLicencesEndDatesProcess()
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ImportPurposeConditionTypesJob.createMessage())
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
