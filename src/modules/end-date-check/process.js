'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const WaterSystemConnector = require('../../lib/connectors/water-system.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await WaterSystemConnector.postLicencesEndDatesCheck()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'end-date-check: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('end-date-check: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
