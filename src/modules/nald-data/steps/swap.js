'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const ProcessHelper = require('@envage/water-abstraction-helpers').process

async function go () {
  try {
    global.GlobalNotifier.omg('nald-data.swap started')

    const startTime = currentTimeInNanoseconds()

    await db.query('DROP SCHEMA IF EXISTS import CASCADE;')
    await db.query('ALTER SCHEMA import_temp RENAME TO import;')

    await ProcessHelper.execCommand("rm -rf './temp/'")

    calculateAndLogTimeTaken(startTime, 'nald-data.swap complete')
  } catch (error) {
    global.GlobalNotifier.omfg('nald-data.swap errored', error)
    throw error
  }
}

module.exports = {
  go
}
