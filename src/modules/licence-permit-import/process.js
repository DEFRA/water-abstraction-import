'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go (permitJson, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (!permitJson || permitJson.data.versions.length === 0) {
      global.GlobalNotifier.omg('licence-permit-import: skipped')
      messages.push(`Skipped ${permitJson?.LIC_NO}`)

      return messages
    }

    await PersistPermit.go(permitJson)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-permit-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-permit-import: errored', { licenceRef: permitJson?.LIC_NO }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
