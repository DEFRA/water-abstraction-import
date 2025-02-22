'use strict'

const Controller = require('./controller.js')

const licenceImportRoutes = require('./modules/licence-import/routes')
const returnsRoutes = require('./modules/returns/routes')

module.exports = [
  {
    method: 'GET',
    path: '/health/info',
    handler: Controller.healthInfo,
    config: {
      auth: false
    }
  },
  {
    method: 'GET',
    path: '/import/1.0/jobs/summary',
    handler: Controller.jobSummary,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/import-job',
    handler: Controller.importJob
  },
  {
    method: 'POST',
    path: '/process/bill-runs-import',
    handler: Controller.billRunsImport
  },
  {
    method: 'POST',
    path: '/process/charge-versions-import',
    handler: Controller.billRunsImport
  },
  {
    method: 'POST',
    path: '/process/clean',
    handler: Controller.clean
  },
  {
    method: 'POST',
    path: '/process/clear-queues',
    handler: Controller.clearQueues
  },
  {
    method: 'post',
    handler: Controller.crmV2Import,
    path: '/process/crm-v2-import'
  },
  {
    method: 'POST',
    path: '/process/end-date-check',
    handler: Controller.endDateCheck
  },
  {
    method: 'POST',
    path: '/process/end-date-trigger',
    handler: Controller.endDateTrigger
  },
  {
    method: 'POST',
    path: '/process/extract-nald-data',
    handler: Controller.extractNaldData
  },
  {
    method: 'POST',
    path: '/process/extract-old-lines',
    handler: Controller.extractOldLines
  },
  {
    method: 'POST',
    path: '/process/flag-deleted-documents',
    handler: Controller.flagDeletedDocuments
  },
  {
    method: 'POST',
    path: '/process/import-job-email',
    handler: Controller.importJobEmail
  },
  {
    method: 'POST',
    path: '/process/licence-legacy-import',
    handler: Controller.licenceLegacyImport
  },
  {
    method: 'POST',
    path: '/process/licence-points-import',
    handler: Controller.licencePointsImport
  },
  {
    method: 'POST',
    path: '/process/licence-returns-import',
    handler: Controller.licenceReturnsImport
  },
  {
    method: 'POST',
    path: '/process/link-to-mod-logs',
    handler: Controller.linkToModLogs
  },
  {
    method: 'POST',
    path: '/process/reference-data-import',
    handler: Controller.referenceDataImport
  },
  {
    method: 'POST',
    path: '/process/return-versions-import',
    handler: Controller.returnVersionsImport
  },
  ...licenceImportRoutes,
  ...returnsRoutes
]
