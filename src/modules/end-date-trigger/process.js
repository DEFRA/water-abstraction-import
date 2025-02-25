'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const WaterSystemConnector = require('../../lib/connectors/water-system.js')

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    await WaterSystemConnector.postLicencesEndDatesProcess()

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
