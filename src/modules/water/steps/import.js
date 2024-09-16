'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0
  let rejected = 0

  try {
    global.GlobalNotifier.omg('water.import started')

    const startTime = currentTimeInNanoseconds()

    const licences = await _licences()

    count = licences.length

    rejected = await _import(licences, count)

    calculateAndLogTimeTaken(startTime, 'water.import complete', { count, rejected })
  } catch (error) {
    global.GlobalNotifier.omfg('water.import errored', error, { count, rejected })
    throw error
  }

  return { count, rejected }
}

async function _import (licences, count) {
  const batchSize = 10

  let progress = PROGRESS_TICK
  let rejected = 0

  // for (let i = 0; i < count; i++) {
  //   if (i === progress) {
  //     progress = progress + PROGRESS_TICK
  //     global.GlobalNotifier.omg(`water.import progress (${i} of ${count})`)
  //   }

  //   const licenceToProcess = licences[i]

  //   try {
  //     await Loader.go(licenceToProcess.LIC_NO)
  //   } catch (error) {
  //     rejected += 1
  //   }
  // }

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`water.import progress (${i} of ${count})`)
    }

    const licencesToProcess = licences.slice(i, i + batchSize)

    const processes = licencesToProcess.map((licenceToProcess) => {
      return Loader.go(licenceToProcess.LIC_NO)
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
  return db.query('SELECT "LIC_NO" FROM "import"."NALD_ABS_LICENCES";')
}

module.exports = {
  go
}
