'use strict'

const CrmTransformer = require('./lib/crm-transformer.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistCrm = require('./lib/persist-crm.js')

async function go (permitJson, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (!permitJson || permitJson.data.versions.length === 0) {
      return null
    }

    const crmData = CrmTransformer.go(permitJson)

    await PersistCrm.go(crmData)

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-crm-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-crm-import: errored', error, { licenceRef: permitJson?.LIC_NO, index })
  }
}

module.exports = {
  go
}
