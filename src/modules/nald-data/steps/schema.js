'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

async function go () {
  try {
    global.GlobalNotifier.omg('nald-data.schema started')

    const startTime = currentTimeInNanoseconds()

    await db.query('DROP SCHEMA IF EXISTS import_temp CASCADE;')
    await db.query('CREATE SCHEMA IF NOT EXISTS import_temp;')

    calculateAndLogTimeTaken(startTime, 'nald-data.schema complete')
  } catch (error) {
    global.GlobalNotifier.omfg('nald-data.schema errored', error)
    throw error
  }
}

module.exports = {
  go
}
