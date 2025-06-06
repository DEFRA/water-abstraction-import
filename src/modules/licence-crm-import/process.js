'use strict'

const CrmTransformer = require('./lib/crm-transformer.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PersistCrm = require('./lib/persist-crm.js')

async function go (permitJson, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (!permitJson || permitJson.data.versions.length === 0) {
      global.GlobalNotifier.omg('licence-crm-import: skipped')
      messages.push(`Skipped ${permitJson?.LIC_NO}`)

      return messages
    }

    const crmData = CrmTransformer.go(permitJson)

    await PersistCrm.go(crmData)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-crm-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-crm-import: errored', { licenceRef: permitJson?.LIC_NO }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
