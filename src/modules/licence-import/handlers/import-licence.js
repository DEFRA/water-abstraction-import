'use strict'

const extract = require('../extract')
const load = require('../load')
const transform = require('../transform')

const config = require('../../../../config.js')

module.exports = async (job) => {
  try {
    // Extract data
    const data = await extract.getLicenceData(job.data.licenceNumber)

    // Transform to new structure
    const mapped = transform.licence.transformLicence(data)

    // Load licence to DB
    await load.licence.loadLicence(mapped)

    if (config.log.level === 'debug') {
      global.GlobalNotifier.omg(`import.licence: ${job.data.licenceNumber}`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('import.licence: errored', error)
    throw error
  }
}
