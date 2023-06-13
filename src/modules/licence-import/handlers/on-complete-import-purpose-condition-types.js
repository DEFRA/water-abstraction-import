'use strict'

const jobs = require('../jobs')

module.exports = async (messageQueue) => {
  messageQueue.publish(jobs.importCompanies())

  global.GlobalNotifier.omg('import.purpose-condition-types: finished')
}
