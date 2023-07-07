'use strict'

const importCompanies = require('../connectors/import-companies')
const ImportCompanyJob = require('./import-company.js')

const JOB_NAME = 'licence-import.queue-companies'

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

    await importCompanies.clear()
    const data = await importCompanies.initialise()

    return data.map((row) => {
      return {
        regionCode: parseInt(row.region_code),
        partyId: parseInt(row.party_id)
      }
    })
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { value: parties } = job.data.response

    for (const party of parties) {
      await messageQueue.publish(ImportCompanyJob.createMessage(party.regionCode, party.partyId))
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
