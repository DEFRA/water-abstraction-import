'use strict'

const cron = require('node-cron')

const LicencesJob = require('./jobs/licences.js')
const PointsJob = require('./jobs/points.js')
const ReturnsJob = require('./jobs/returns.js')

const config = require('../../../config.js')

async function register (server, _options) {
  // Register points job
  await server.messageQueue.subscribe(PointsJob.JOB_NAME, PointsJob.handler)
  await server.messageQueue.onComplete(PointsJob.JOB_NAME, (executedJob) => {
    return PointsJob.onComplete(server.messageQueue, executedJob)
  })

  // Register licences job (licence_version_purpose_points)
  await server.messageQueue.subscribe(LicencesJob.JOB_NAME, LicencesJob.handler)
  await server.messageQueue.onComplete(LicencesJob.JOB_NAME, (executedJob) => {
    return LicencesJob.onComplete(server.messageQueue, executedJob)
  })

  // Register returns job (return_requirement_points)
  await server.messageQueue.subscribe(ReturnsJob.JOB_NAME, ReturnsJob.handler)
  await server.messageQueue.onComplete(ReturnsJob.JOB_NAME, (executedJob) => {
    return ReturnsJob.onComplete(executedJob)
  })

  // Schedule points job using cron. The points job will then queue the licences job in its onComplete
  cron.schedule(config.import.points.schedule, async () => {
    await server.messageQueue.publish(PointsJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importPoints',
    dependencies: ['pgBoss'],
    register
  }
}
