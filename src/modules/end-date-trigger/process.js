'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const WaterSystemConnector = require('../../lib/connectors/water-system.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await WaterSystemConnector.postLicencesEndDatesProcess()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'end-date-trigger: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('end-date-trigger: errored', error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
