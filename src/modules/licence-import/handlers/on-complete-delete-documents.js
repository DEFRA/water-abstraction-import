'use strict'

const jobs = require('../jobs')

module.exports = async (messageQueue) => {
  messageQueue.publish(jobs.importPurposeConditionTypes())

  global.GlobalNotifier.omg('import.delete-documents: finished')
}
