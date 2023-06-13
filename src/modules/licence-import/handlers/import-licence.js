'use strict'

const extract = require('../extract')
const load = require('../load')
const transform = require('../transform')

module.exports = async (job) => {
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
