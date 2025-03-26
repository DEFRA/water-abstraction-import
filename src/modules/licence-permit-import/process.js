'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go (permitJson, index = 0, log = false) {
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
      calculateAndLogTimeTaken(startTime, `licence-permit-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-permit-import: errored', error, { licenceRef: permitJson?.LIC_NO, index })

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
