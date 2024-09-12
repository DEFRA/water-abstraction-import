'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0

  try {
    global.GlobalNotifier.omg('crm.import started')

    const startTime = currentTimeInNanoseconds()

    const parties = await _parties()

    count = parties.length

    await _import(parties, count)

    calculateAndLogTimeTaken(startTime, 'crm.import complete', { count })
  } catch (error) {
    global.GlobalNotifier.omfg('crm.import errored', error, { count })
    throw error
  }
}

async function _import (parties, count) {
  const batchSize = 10

  let progress = PROGRESS_TICK

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`crm.import progress (${i} of ${count})`)
    }

    const partiesToProcess = parties.slice(i, i + batchSize)

    const processes = partiesToProcess.map((partyToProcess) => {
      return Loader.go(partyToProcess.FGAC_REGION_CODE, partyToProcess.ID)
    })

    await Promise.all(processes)
  }
}

async function _parties () {
  return db.query('SELECT "ID", "FGAC_REGION_CODE" FROM "import"."NALD_PARTIES";')
}

module.exports = {
  go
}
