const chargingImportRoutes = require('./modules/charging-import/routes')
const coreRoutes = require('./modules/core/routes')
const healthRoutes = require('./modules/health/routes')
const jobSummaryRoutes = require('./modules/jobs/routes')
const licenceImportRoutes = require('./modules/licence-import/routes')
const naldImportRoutes = require('./modules/nald-import/routes')
const returnsRoutes = require('./modules/returns/routes')
const returnLogsRoutes = require('./modules/return-logs/routes')
const returnVersionsRoutes = require('./modules/return-versions/routes.js')
const modLogsRoutes = require('./modules/mod-logs/routes.js')
const pointsRoutes = require('./modules/points/routes.js')

module.exports = [
  ...chargingImportRoutes,
  ...coreRoutes,
  ...healthRoutes,
  ...jobSummaryRoutes,
  ...licenceImportRoutes,
  ...naldImportRoutes,
  ...returnsRoutes,
  ...returnLogsRoutes,
  ...returnVersionsRoutes,
  ...modLogsRoutes,
  ...pointsRoutes
]
