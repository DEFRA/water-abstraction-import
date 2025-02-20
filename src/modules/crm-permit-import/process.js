'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PermitTransformer = require('./lib/permit-transformer.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const licenceData = await PermitTransformer.go(licence)

    if (licenceData.data.versions.length > 0) {
      const licenceId = await PersistPermit.go(licenceData)
      console.log('🚀 ~ go ~ licenceId:', licenceId)
    }

    if (log) {
      calculateAndLogTimeTaken(startTime, `crm-permit-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('crm-permit-import: errored', error, { licence, index })
  }
}

module.exports = {
  go
}
