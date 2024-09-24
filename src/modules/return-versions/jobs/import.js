'use strict'

const { pool } = require('../../../lib/connectors/db.js')
const Queries = require('../lib/import-queries.js')

const JOB_NAME = 'return-versions.import'

function createMessage () {
  return {
    name: JOB_NAME,
    options: {
      singletonKey: JOB_NAME
    }
  }
}

async function handler () {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    await pool.query(Queries.importReturnVersions)
    await pool.query(Queries.importReturnRequirements)
    await pool.query(Queries.importReturnRequirementPurposes)
    await pool.query(Queries.importReturnVersionsMultipleUpload)
    await pool.query(Queries.importReturnVersionsCreateNotesFromDescriptions)
    await pool.query(Queries.importReturnVersionsCorrectStatusForWrls)
    await pool.query(Queries.importReturnVersionsSetToDraftMissingReturnRequirements)
    await pool.query(Queries.importReturnVersionsAddMissingReturnVersionEndDates)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  if (!job.failed) {
    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  } else {
    global.GlobalNotifier.omg(`${JOB_NAME}: failed`)
  }
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
