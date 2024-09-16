'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Queries = require('../lib/queries.js')

async function go () {
  try {
    global.GlobalNotifier.omg('mod-logs.import started')

    const startTime = currentTimeInNanoseconds()

    await db.query(Queries.importModLogs)
    await db.query(Queries.linkLicencesToModLogs)
    await db.query(Queries.linkChargeVersionsToModLogs)
    await db.query(Queries.linkLicenceVersionsToModLogs)
    await db.query(Queries.linkReturnVersionsToModLogs)
    await db.query(Queries.updateReturnVersionReasons)

    calculateAndLogTimeTaken(startTime, 'mod-logs.import complete')
  } catch (error) {
    global.GlobalNotifier.omfg('mod-logs.import errored', error)
    throw error
  }
}

module.exports = {
  go
}
