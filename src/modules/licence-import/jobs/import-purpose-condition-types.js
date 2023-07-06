'use strict'

const ImportCompaniesJob = require('./import-companies.js')
const purposeConditionsConnector = require('../connectors/purpose-conditions-types')

const JOB_NAME = 'import.purpose-condition-types'

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
    global.GlobalNotifier.omg('import.purpose-condition-types: started')

    return purposeConditionsConnector.createPurposeConditionTypes()
  } catch (error) {
    global.GlobalNotifier.omfg('import.purpose-condition-types: errored', error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    await messageQueue.publish(ImportCompaniesJob.createMessage())
  }

  global.GlobalNotifier.omg('import.purpose-condition-types: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
