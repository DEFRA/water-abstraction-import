'use strict'

const extract = require('../extract')
const ImportLicenceJob = require('./import-licence.js')

const JOB_NAME = 'licence-import.queue-licences'

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

    const rows = await extract.getAllLicenceNumbers()

    return rows
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { value: licences } = job.data.response
    const numberOfJobs = licences.length

    for (const [index, licence] of licences.entries()) {
      // This information is to help us log when the import licence jobs start and finish. See
      // src/modules/licence-import/jobs/import-licence.js for more details
      const data = {
        licenceNumber: licence.LIC_NO,
        jobNumber: index + 1,
        numberOfJobs
      }
      await messageQueue.publish(ImportLicenceJob.createMessage(data))
    }
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
