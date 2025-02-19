'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (messageQueue,log = false) {
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
    messageQueue.deleteQueue('import-job.company-import')
    messageQueue.deleteQueue('import-job.link-to-mod-logs')
    messageQueue.deleteQueue('import-job.end-date-trigger')
    messageQueue.deleteQueue('import-job.import-job-email')

    await _clearJobHistory()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clear-queues: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clear-queues: errored', error)
  }
}

async function _clearJobHistory () {
  await db.query('TRUNCATE water_import.archive;')
  await db.query(`DELETE FROM water_import.job WHERE state IN ('completed', 'failed');`)
}

module.exports = {
  go
}
