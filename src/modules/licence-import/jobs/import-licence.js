'use strict'

const extract = require('../extract')
const load = require('../load')
const transform = require('../transform')

const JOB_NAME = 'import.licence'

const options = {
  teamSize: 75,
  teamConcurrency: 1
}

function createMessage (licenceNumber) {
  return {
    name: JOB_NAME,
    data: {
      licenceNumber
    },
    options: {
      singletonKey: `${JOB_NAME}.${licenceNumber}`
    }
  }
}

async function handler (job) {
  try {
    // Extract data
    const data = await extract.getLicenceData(job.data.licenceNumber)

    // Transform to new structure
    const mapped = transform.licence.transformLicence(data)

    // Load licence to DB
    await load.licence.loadLicence(mapped)
  } catch (error) {
    global.GlobalNotifier.omfg('import.licence: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  name: JOB_NAME,
  options
}
