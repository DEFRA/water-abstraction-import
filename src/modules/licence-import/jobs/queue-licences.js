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

    for (const licence of licences) {
      await messageQueue.publish(ImportLicenceJob.createMessage(licence.LIC_NO))
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
