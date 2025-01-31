'use strict'

const QueueJob = require('./jobs/queue.js')

async function importReturnLogs (request, h) {
  await request.messageQueue.deleteQueue(QueueJob.JOB_NAME)
  await request.messageQueue.publish(QueueJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  importReturnLogs
}
