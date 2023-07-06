'use strict'

const importCompanies = require('../connectors/import-companies')
const ImportCompanyJob = require('./import-company.js')

const JOB_NAME = 'import.companies'

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
    global.GlobalNotifier.omg('import.companies: started')

    await importCompanies.clear()
    const data = await importCompanies.initialise()

    return data.map((row) => {
      return {
        regionCode: parseInt(row.region_code),
        partyId: parseInt(row.party_id)
      }
    })
  } catch (error) {
    global.GlobalNotifier.omfg('import.companies: errored', error)
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

  global.GlobalNotifier.omg('import.companies: finished')
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
