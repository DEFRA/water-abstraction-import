'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Loader = require('../lib/loader.js')

const PROGRESS_TICK = 1000

async function go () {
  let count = 0
  let rejected = 0

  try {
    global.GlobalNotifier.omg('permit.import started')

    const startTime = currentTimeInNanoseconds()

    const licenceReferences = await _licenceReferences()
    count = licenceReferences.length

    rejected = await _import(licenceReferences, count)

    calculateAndLogTimeTaken(startTime, 'permit.import complete', { count, rejected })
  } catch (error) {
    global.GlobalNotifier.omfg('permit.import errored', error, { count, rejected })
    throw error
  }

  return { count, rejected }
}

async function _import (licenceReferences, count) {
  const batchSize = 10

  let progress = PROGRESS_TICK
  let rejected = 0

  for (let i = 0; i < count; i += batchSize) {
    if (i === progress) {
      progress = progress + PROGRESS_TICK
      global.GlobalNotifier.omg(`permit.import progress (${i} of ${count})`)
    }

    const referenceToProcess = licenceReferences.slice(i, i + batchSize)

    const processes = referenceToProcess.map((referenceToProcess) => {
      return Loader.load(referenceToProcess.LIC_NO)
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

async function _licenceReferences () {
  return db.query('SELECT "LIC_NO" FROM "import"."NALD_ABS_LICENCES";')
}

module.exports = {
  go
}
