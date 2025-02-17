'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (messageQueue,log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    // Import job
    // NOTE: 'import-job.clear-queues' is not listed because if it was it would delete the job in the middle of it
    // running!
    messageQueue.deleteQueue('import-job.extract-nald-data')
    messageQueue.deleteQueue('import-job.clean')
    messageQueue.deleteQueue('import-job.end-date-check')
    messageQueue.deleteQueue('import-job.reference-data-import')
    messageQueue.deleteQueue('import-job.return-versions-import')

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clear-queues: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clear-queues: errored', error)
  }
}

module.exports = {
  go
}
