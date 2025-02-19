'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const WaterSystemService = require('../../lib/services/water-system-service.js')

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    await WaterSystemService.postLicencesEndDatesProcess()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'end-date-trigger: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('end-date-trigger: errored', error)
  }
}

module.exports = {
  go
}
