'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0

  try {
    global.GlobalNotifier.omg('permit.import started')

    const startTime = currentTimeInNanoseconds()

    const licenceReferences = await _licenceReferences()
    count = licenceReferences.length

    await _import(licenceReferences, count)

    calculateAndLogTimeTaken(startTime, 'permit.import complete', { count })
  } catch (error) {
    global.GlobalNotifier.omfg('permit.import errored', error, { count })
    throw error
  }
}

async function _import (licenceReferences, count) {
  const batchSize = 10

  let progress = PROGRESS_TICK

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`permit.import progress (${i} of ${count})`)
    }

    const referenceToProcess = licenceReferences.slice(i, i + batchSize)

    const processes = referenceToProcess.map((referenceToProcess) => {
      return Loader.load(referenceToProcess.LIC_NO)
    })

    await Promise.all(processes)
  }
}

async function _licenceReferences () {
  return db.query('SELECT "LIC_NO" FROM "import"."NALD_ABS_LICENCES";')
}

module.exports = {
  go
}
