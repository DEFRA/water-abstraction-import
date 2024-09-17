'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const config = require('../../../../config.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0
  let rejected = 0

  try {
    global.GlobalNotifier.omg('company-details.import started')

    const startTime = currentTimeInNanoseconds()

    const parties = await _parties()

    count = parties.length

    rejected = await _import(parties, count)

    calculateAndLogTimeTaken(startTime, 'company-details.import complete', { count, rejected })
  } catch (error) {
    global.GlobalNotifier.omfg('company-details.import errored', error, { count, rejected })
    throw error
  }

  return { count, rejected }
}

async function _import (parties, count) {
  const batchSize = config.processBatchSize

  let progress = PROGRESS_TICK
  let rejected = 0

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`company-details.import progress (${i} of ${count})`)
    }

    const partiesToProcess = parties.slice(i, i + batchSize)

    const processes = partiesToProcess.map((partyToProcess) => {
      return Loader.go(partyToProcess.FGAC_REGION_CODE, partyToProcess.ID)
    })

    const results = await Promise.allSettled(processes)
    const rejectedResults = results.filter((result) => {
      return result.status === 'rejected'
    })

    if (rejectedResults.length === batchSize) {
      throw new Error('Whole batch rejected')
    }

    rejected += rejectedResults.length
  }

  return rejected
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

module.exports = {
  go
}
