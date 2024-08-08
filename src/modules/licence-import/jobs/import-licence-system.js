'use strict'

const WaterSystemService = require('../../../lib/services/water-system-service.js')
const QueueLicencesJob = require('./queue-licences.js')

const JOB_NAME = 'licence-import.import-licence-system'
const STATUS_NO_CONTENT = 204

const options = {
  teamSize: 75, teamConcurrency: 1
}

function createMessage (data) {
  return {
    name: JOB_NAME,
    data,
    options: {
      singletonKey: `${JOB_NAME}.${data.licenceNumber}`
    }
  }
}

async function handler (job) {
  try {
    if (job.data.jobNumber === 1) {
      global.GlobalNotifier.omg(`${JOB_NAME}: started`)
    }

    const { licenceNumber } = job.data

    const response = await WaterSystemService.postImportLicence({
      licenceRef: licenceNumber
    })

    if (response.statusCode !== STATUS_NO_CONTENT) {
      throw new Error(`Licence ${licenceNumber} failed with status code - ${response.statusCode}`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  try {
    const { data } = job.data.request

    if (data.jobNumber === data.numberOfJobs) {
      global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { numberOfJobs: job.data.request.data.numberOfJobs })
    }

    // when the first job run is done queue the legacy licence import queue
    if (data.jobNumber === 1) {
      await messageQueue.publish(QueueLicencesJob.createMessage())
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

module.exports = {
  createMessage, handler, name: JOB_NAME, options, onComplete
}
