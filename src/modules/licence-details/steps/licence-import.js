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
    global.GlobalNotifier.omg('licence-details.licence-import started')

    const startTime = currentTimeInNanoseconds()

    const licences = await _licences()

    count = licences.length

    rejected = await _import(licences, count)

    calculateAndLogTimeTaken(startTime, 'licence-details.licence-import complete', { count, rejected })
  } catch (error) {
    global.GlobalNotifier.omfg('licence-details.licence-import errored', error, { count, rejected })
    throw error
  }

  return { count, rejected }
}

async function _import (licences, count) {
  const batchSize = config.processBatchSize

  let progress = PROGRESS_TICK
  let rejected = 0

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`licence-details.licence-import progress (${i} of ${count})`)
    }

    const licencesToProcess = licences.slice(i, i + batchSize)

    const processes = licencesToProcess.map((licenceToProcess) => {
      return Loader.go(licenceToProcess)
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

async function _licences () {
  const query = `
    SELECT
      "ID",
      "LIC_NO",
      "FGAC_REGION_CODE",
      "ORIG_EFF_DATE",
      "EXPIRY_DATE",
      "LAPSED_DATE",
      "REV_DATE",
      "AREP_EIUC_CODE",
      "AREP_AREA_CODE",
      "AREP_SUC_CODE",
      "AREP_LEAP_CODE"
    FROM
      "import"."NALD_ABS_LICENCES";
  `

  return db.query(query)
}

module.exports = {
  go
}
