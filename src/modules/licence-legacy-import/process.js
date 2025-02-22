'use strict'

const CrmTransformer = require('./lib/crm-transformer.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PermitTransformer = require('./lib/permit-transformer.js')
const PersistCrm = require('./lib/persist-crm.js')
const PersistPermit = require('./lib/persist-permit.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const permitData = await PermitTransformer.go(licence)

    if (permitData.data.versions.length > 0) {
      const licenceId = await PersistPermit.go(permitData)

      const crmData = CrmTransformer.go(permitData, licenceId)

      await PersistCrm.go(crmData)
    }

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-legacy-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-legacy-import: errored', error, { licence, index })
  }
}

module.exports = {
  go
}
