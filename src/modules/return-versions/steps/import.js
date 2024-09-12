'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Queries = require('../lib/queries.js')

async function go () {
  try {
    global.GlobalNotifier.omg('return-versions.import started')

    const startTime = currentTimeInNanoseconds()

    await db.query(Queries.importReturnVersions)
    await db.query(Queries.importReturnRequirements)
    await db.query(Queries.importReturnRequirementPoints)
    await db.query(Queries.importReturnRequirementPurposes)
    await db.query(Queries.setMultipleUploadFlag)
    await db.query(Queries.createNotesFromDescriptions)
    await db.query(Queries.correctStatusForWrls)
    await db.query(Queries.setToDraftMissingReturnRequirements)
    await db.query(Queries.addMissingReturnVersionEndDates)

    calculateAndLogTimeTaken(startTime, 'return-versions.import complete')
  } catch (error) {
    global.GlobalNotifier.omfg('return-versions.import errored', error)
    throw error
  }
}

module.exports = {
  go
}
