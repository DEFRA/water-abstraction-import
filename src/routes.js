'use strict'

const Controller = require('./controller.js')

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
    path: '/status',
    handler: Controller.status,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/import-job',
    handler: Controller.importJob,
    config: {
      auth: false
    }
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
    handler: Controller.clean,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/completion-email',
    handler: Controller.completionEmail,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/end-date-check',
    handler: Controller.endDateCheck,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/end-date-trigger',
    handler: Controller.endDateTrigger,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/extract-nald-data',
    handler: Controller.extractNaldData,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/extract-old-lines',
    handler: Controller.extractOldLines,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/flag-deleted-documents',
    handler: Controller.flagDeletedDocuments,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-crm-import',
    handler: Controller.licenceCrmImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-crm-v2-import',
    handler: Controller.licenceCrmV2Import,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-no-start-date-import',
    handler: Controller.licenceNoStartDateImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-permit-import',
    handler: Controller.licencePermitImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-returns-import',
    handler: Controller.licenceReturnsImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licence-submissions-import',
    handler: Controller.licenceSubmissionsImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/licences-import',
    handler: Controller.licencesImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/link-to-mod-logs',
    handler: Controller.linkToModLogs,
    config: {
      auth: false
    }
  },
  {
    method: 'post',
    handler: Controller.partyCrmV2Import,
    path: '/process/party-crm-v2-import',
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/reference-data-import',
    handler: Controller.referenceDataImport,
    config: {
      auth: false
    }
  },
  {
    method: 'POST',
    path: '/process/return-versions-import',
    handler: Controller.returnVersionsImport,
    config: {
      auth: false
    }
  },
  ...returnsRoutes
]
