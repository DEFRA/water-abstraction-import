'use strict'

const cron = require('node-cron')

const CleanJob = require('./jobs/clean.js')
const ClearQueuesJob = require('./jobs/clear-queues.js')
const EndDateCheckJob = require('./jobs/end-date-check.js')
const ExtractNaldDataJob = require('./jobs/extract-nald-data.js')
const ReferenceDataImportJob = require('./jobs/reference-data-import.js')
const ReturnVersionsImportJob = require('./jobs/return-versions-import.js')

const config = require('../../../config')

async function register (server, _options) {
  // Register clear-queues job
  await server.messageQueue.subscribe(ClearQueuesJob.JOB_NAME, () => {
    return ClearQueuesJob.handler(server.messageQueue)
  })
  await server.messageQueue.onComplete(ClearQueuesJob.JOB_NAME, (executedJob) => {
    return ClearQueuesJob.onComplete(server.messageQueue, executedJob)
  })

  // Register extract-nald-data job
  await server.messageQueue.subscribe(ExtractNaldDataJob.JOB_NAME, ExtractNaldDataJob.handler)
  await server.messageQueue.onComplete(ExtractNaldDataJob.JOB_NAME, (executedJob) => {
    return ExtractNaldDataJob.onComplete(server.messageQueue, executedJob)
  })

  // Register clean job
  await server.messageQueue.subscribe(CleanJob.JOB_NAME, CleanJob.handler)
  await server.messageQueue.onComplete(CleanJob.JOB_NAME, (executedJob) => {
    return CleanJob.onComplete(server.messageQueue, executedJob)
  })

  // Register end-date-check job
  await server.messageQueue.subscribe(EndDateCheckJob.JOB_NAME, EndDateCheckJob.handler)
  await server.messageQueue.onComplete(EndDateCheckJob.JOB_NAME, (executedJob) => {
    return EndDateCheckJob.onComplete(server.messageQueue, executedJob)
  })

  // Register reference-data-import job
  await server.messageQueue.subscribe(ReferenceDataImportJob.JOB_NAME, ReferenceDataImportJob.handler)
  await server.messageQueue.onComplete(ReferenceDataImportJob.JOB_NAME, (executedJob) => {
    return ReferenceDataImportJob.onComplete(server.messageQueue, executedJob)
  })

  // Register return-versions-import job
  await server.messageQueue.subscribe(ReturnVersionsImportJob.JOB_NAME, ReturnVersionsImportJob.handler)
  await server.messageQueue.onComplete(ReturnVersionsImportJob.JOB_NAME, (executedJob) => {
    return ReturnVersionsImportJob.onComplete(server.messageQueue, executedJob)
  })

  // Schedule clear-queues job using cron. The clear queues job will then queue the next job in the process in its
  // onComplete
  cron.schedule(config.import.schedule, async () => {
    await server.messageQueue.publish(ClearQueuesJob.createMessage())
  })
}

module.exports = {
  plugin: {
    name: 'importJob',
    dependencies: ['pgBoss'],
    register
  }
}
