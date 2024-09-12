const chargingImportRoutes = require('./modules/charging-import/routes')
const coreRoutes = require('./modules/core/routes')
const healthRoutes = require('./modules/health/routes')
const jobSummaryRoutes = require('./modules/jobs/routes')
const licenceImportRoutes = require('./modules/licence-import/routes')
const naldImportRoutes = require('./modules/nald-import/routes')
const returnsRoutes = require('./modules/returns/routes')
const modLogsRoutes = require('./modules/mod-logs/routes.js')

const NaldDataRoutes = require('./modules/nald-data/routes.js')
const CleanRoutes = require('./modules/clean/routes.js')
const PermitRoutes = require('./modules/permit/routes.js')
const CrmRoutes = require('./modules/crm/routes.js')
const ReturnVersionsRoutes = require('./modules/return-versions/routes.js')
const NightlyImportRoutes = require('./modules/nightly-import/routes.js')

module.exports = [
  ...chargingImportRoutes,
  ...coreRoutes,
  ...healthRoutes,
  ...jobSummaryRoutes,
  ...licenceImportRoutes,
  ...naldImportRoutes,
  ...returnsRoutes,
  ...modLogsRoutes,
  ...NaldDataRoutes,
  ...CleanRoutes,
  ...PermitRoutes,
  ...CrmRoutes,
  ...ReturnVersionsRoutes,
  ...NightlyImportRoutes
]
