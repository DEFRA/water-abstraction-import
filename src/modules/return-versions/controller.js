'use strict'

const CleanJob = require('./jobs/clean.js')

async function importReturnVersions (request, h) {
  await request.messageQueue.deleteQueue(CleanJob.JOB_NAME)
  await request.messageQueue.publish(CleanJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  importReturnVersions
}
