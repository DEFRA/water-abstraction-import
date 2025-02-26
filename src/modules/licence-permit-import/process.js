'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go (permitJson, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (!permitJson.data.versions.length === 0) {
      return null
    }

    await PersistPermit.go(permitJson)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-permit-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-permit-import: errored', error, { licenceRef: permitJson?.LIC_NO, index })
  }
}

module.exports = {
  go
}
