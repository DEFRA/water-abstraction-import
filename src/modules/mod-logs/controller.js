'use strict'

const ImportJob = require('./jobs/import.js')

async function importModLogs (request, h) {
  await request.messageQueue.deleteQueue(ImportJob.JOB_NAME)
  await request.messageQueue.publish(ImportJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  importModLogs
}
