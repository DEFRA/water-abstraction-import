'use strict'

const extract = require('../extract')
const ImportLicenceJob = require('./import-licence.js')

const JOB_NAME = 'import.licences'

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
    global.GlobalNotifier.omg('import.licences: started')

    const rows = await extract.getAllLicenceNumbers()

    return rows
  } catch (error) {
    global.GlobalNotifier.omfg('import.licences: errored', error)
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

  global.GlobalNotifier.omg('import.licences: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
