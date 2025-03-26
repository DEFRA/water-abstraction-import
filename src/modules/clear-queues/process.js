'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (messageQueue, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    // Import job
    // NOTE: 'import-job.clear-queues' is not listed because if it was it would delete the job in the middle of it
    // running!
    messageQueue.deleteQueue('import-job.extract-nald-data')
    messageQueue.deleteQueue('import-job.extract-old-lines')
    messageQueue.deleteQueue('import-job.clean')
    messageQueue.deleteQueue('import-job.flag-deleted-documents')
    messageQueue.deleteQueue('import-job.end-date-check')
    messageQueue.deleteQueue('import-job.reference-data-import')
    messageQueue.deleteQueue('import-job.return-versions-import')
    messageQueue.deleteQueue('import-job.party-crm-v2-import')
    messageQueue.deleteQueue('import-job.licence-data-import')
    messageQueue.deleteQueue('import-job.licences-import')
    messageQueue.deleteQueue('import-job.link-to-mod-logs')
    messageQueue.deleteQueue('import-job.end-date-trigger')
    messageQueue.deleteQueue('import-job.completion-email')

    await _clearJobHistory()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clear-queues: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clear-queues: errored', error)

    messages.push(error.message)
  }

  return messages
}

async function _clearJobHistory () {
  await db.query('TRUNCATE water_import.archive;')
  await db.query("DELETE FROM water_import.job WHERE state IN ('completed', 'failed');")

  // TODO: Delete me! This is only needed to ensure the job table is truly cleared out the first time this new version
  // of the import is run.
  const today = new Date()
  const yesterday = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate() - 1}`)
  await db.query("DELETE FROM water_import.job WHERE createdon < $1", [yesterday])
}

module.exports = {
  go
}
