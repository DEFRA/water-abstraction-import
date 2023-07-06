'use strict'

const extract = require('../extract')
const importCompanies = require('../connectors/import-companies')
const QueueLicencesJob = require('./queue-licences.js')
const load = require('../load')
const transform = require('../transform')

const JOB_NAME = 'licence-import.import-company'

const options = {
  teamSize: 75,
  teamConcurrency: 1
}

/**
 * Formats arguments to publish a PG boss event to import company
 *
 * @param {Number} regionCode - NALD region code
 * @param {Number} partyId - NALD party ID
 *
 * @return {Object}
 */
function createMessage (regionCode, partyId) {
  return {
    name: JOB_NAME,
    data: {
      regionCode,
      partyId
    },
    options: {
      singletonKey: `${JOB_NAME}.${regionCode}.${partyId}`,
      expireIn: '1 hours'
    }
  }
}

async function handler (job) {
  try {
    const { regionCode, partyId } = job.data

    // Extract data
    const data = await extract.getCompanyData(regionCode, partyId)

    // Transform to new structure
    const mapped = transform.company.transformCompany(data)

    // Load to CRM database
    await load.company.loadCompany(mapped)

    await importCompanies.setImportedStatus(regionCode, partyId)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue) {
  const count = await importCompanies.getPendingCount()

  if (count === 0) {
    await messageQueue.deleteQueue('__state__completed__licence-import.import-company')
    await messageQueue.publish(QueueLicencesJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  }
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME,
  options
}
