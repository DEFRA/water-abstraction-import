const chargingImportRoutes = require('./modules/charging-import/routes')
const coreRoutes = require('./modules/core/routes')
const healthRoutes = require('./modules/health/routes')
const jobSummaryRoutes = require('./modules/jobs/routes')
const licenceImportRoutes = require('./modules/licence-import/routes')
const naldImportRoutes = require('./modules/nald-import/routes')
const returnsRoutes = require('./modules/returns/routes')

module.exports = [
  ...chargingImportRoutes,
  ...coreRoutes,
  healthRoutes.getInfo,
  ...jobSummaryRoutes,
  ...licenceImportRoutes,
  ...naldImportRoutes,
  ...returnsRoutes
]
