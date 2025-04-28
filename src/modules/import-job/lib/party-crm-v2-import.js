'use strict'

const db = require('../../../lib/connectors/db.js')
const { currentTimeInNanoseconds, durations } = require('../../../lib/general.js')
const PartyCrmV2ImportProcess = require('../../party-crm-v2-import/process.js')

const STEP_NAME = 'party-crm-v2-import'

async function go () {
  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: started`)

  const step = { logTime: new Date(), name: STEP_NAME }

  const startTime = currentTimeInNanoseconds()

  step.messages = await _process()

  const { timeTakenSs } = durations(startTime)

  step.duration = timeTakenSs

  global.GlobalNotifier.omg(`import-job.${STEP_NAME}: completed`)

  return step
}

async function _parties () {
  return db.query(`
    SELECT
      "ID",
      "APAR_TYPE",
      "NAME",
      "FORENAME",
      "INITIALS",
      "SALUTATION",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_PARTIES";
  `)
}

async function _process () {
  const pMap = (await import('p-map')).default

  const parties = await _parties()

  const allMessages = await pMap(parties, _processParty, { concurrency: 10 })

  return allMessages.flat()
}

async function _processParty (party) {
  return PartyCrmV2ImportProcess.go(party, false)
}

module.exports = {
  go
}
