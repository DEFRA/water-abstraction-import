'use strict'

const PointsJob = require('./jobs/points.js')

async function points (request, h) {
  await request.messageQueue.deleteQueue(PointsJob.JOB_NAME)
  await request.messageQueue.publish(PointsJob.createMessage())

  return h.response().code(204)
}

module.exports = {
  points
}
