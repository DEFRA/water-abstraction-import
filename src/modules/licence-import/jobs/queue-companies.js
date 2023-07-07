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
    const numberOfJobs = parties.length

    for (const [index, party] of parties.entries()) {
      // This information is to help us log when the import company jobs start and finish. See
      // src/modules/licence-import/jobs/import-company.js for more details
      const data = {
        regionCode: party.regionCode,
        partyId: party.partyId,
        jobNumber: index + 1,
        numberOfJobs
      }
      await messageQueue.publish(ImportCompanyJob.createMessage(data))
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
