'use strict'

const cron = require('node-cron')

const CleanJob = require('./jobs/clean.js')
const ClearQueuesJob = require('./jobs/clear-queues.js')
const CrmV2ImportJob = require('./jobs/crm-v2-import.js')
const EndDateCheckJob = require('./jobs/end-date-check.js')
const EndDateTriggerJob = require('./jobs/end-date-trigger.js')
const ExtractNaldDataJob = require('./jobs/extract-nald-data.js')
const ExtractOldLinesJob = require('./jobs/extract-old-lines.js')
const FlagDeletedDocumentsJob = require('./jobs/flag-deleted-documents.js')
const ImportJobEmailJob = require('./jobs/import-job-email.js')
const LinkToModLogsProcessJob = require('./jobs/link-to-mod-logs.js')
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

  // Register extract-old-lines job
  await server.messageQueue.subscribe(ExtractOldLinesJob.JOB_NAME, ExtractOldLinesJob.handler)
  await server.messageQueue.onComplete(ExtractOldLinesJob.JOB_NAME, (executedJob) => {
    return ExtractOldLinesJob.onComplete(server.messageQueue, executedJob)
  })

  // Register clean job
  await server.messageQueue.subscribe(CleanJob.JOB_NAME, CleanJob.handler)
  await server.messageQueue.onComplete(CleanJob.JOB_NAME, (executedJob) => {
    return CleanJob.onComplete(server.messageQueue, executedJob)
  })

  // Register flag-deleted-documents job
  await server.messageQueue.subscribe(FlagDeletedDocumentsJob.JOB_NAME, FlagDeletedDocumentsJob.handler)
  await server.messageQueue.onComplete(FlagDeletedDocumentsJob.JOB_NAME, (executedJob) => {
    return FlagDeletedDocumentsJob.onComplete(server.messageQueue, executedJob)
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

  // Register crm-v2-import job
  await server.messageQueue.subscribe(CrmV2ImportJob.JOB_NAME, CrmV2ImportJob.handler)
  await server.messageQueue.onComplete(CrmV2ImportJob.JOB_NAME, (executedJob) => {
    return CrmV2ImportJob.onComplete(server.messageQueue, executedJob)
  })

  // Register link-to-mod-logs job
  await server.messageQueue.subscribe(LinkToModLogsProcessJob.JOB_NAME, LinkToModLogsProcessJob.handler)
  await server.messageQueue.onComplete(LinkToModLogsProcessJob.JOB_NAME, (executedJob) => {
    return LinkToModLogsProcessJob.onComplete(server.messageQueue, executedJob)
  })

  // Register end-date-trigger job
  await server.messageQueue.subscribe(EndDateTriggerJob.JOB_NAME, EndDateTriggerJob.handler)
  await server.messageQueue.onComplete(EndDateTriggerJob.JOB_NAME, (executedJob) => {
    return EndDateTriggerJob.onComplete(server.messageQueue, executedJob)
  })

  // Register import-job-email job
  await server.messageQueue.subscribe(ImportJobEmailJob.JOB_NAME, ImportJobEmailJob.handler)
  await server.messageQueue.onComplete(ImportJobEmailJob.JOB_NAME, (executedJob) => {
    return ImportJobEmailJob.onComplete(executedJob)
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
