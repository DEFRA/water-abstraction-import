'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0

  try {
    global.GlobalNotifier.omg('water.import started')

    const startTime = currentTimeInNanoseconds()

    const licences = await _licences()

    count = licences.length

    await _import(licences, count)

    calculateAndLogTimeTaken(startTime, 'water.import complete', { count })
  } catch (error) {
    global.GlobalNotifier.omfg('water.import errored', error, { count })
    throw error
  }
}

async function _import (licences, count) {
  const batchSize = 10

  let progress = PROGRESS_TICK

  // for (let i = 0; i < count; i++) {
  //   if (i === progress) {
  //     progress = progress + PROGRESS_TICK
  //     global.GlobalNotifier.omg(`water.import progress (${i} of ${count})`)
  //   }

  //   const licenceToProcess = licences[i]

  //   await Loader.go(licenceToProcess.LIC_NO)
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

    await Promise.all(processes)
  }
}

async function _licences () {
  return db.query('SELECT l."LIC_NO" FROM "import"."NALD_ABS_LICENCES" l;')
}

module.exports = {
  go
}
