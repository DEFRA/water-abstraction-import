const coreRoutes = require('./modules/core/routes')
const healthRoutes = require('./modules/health/routes')
const returnsRoutes = require('./modules/returns/routes')

const NaldDataRoutes = require('./modules/nald-data/routes.js')
const CleanRoutes = require('./modules/clean/routes.js')
const PermitRoutes = require('./modules/permit/routes.js')
const CompanyDetailsRoutes = require('./modules/company-details/routes.js')
const ReturnVersionsRoutes = require('./modules/return-versions/routes.js')
const ModLogsRoutes = require('./modules/mod-logs/routes.js')
const ReferenceRoutes = require('./modules/reference/routes.js')
const ChargeVersionsRoutes = require('./modules/charge-versions/routes.js')
const BillRunsRoutes = require('./modules/bill-runs/routes.js')
const LicenceDetailsRoutes = require('./modules/licence-details/routes.js')
const NightlyImportRoutes = require('./modules/nightly-import/routes.js')

module.exports = [
  ...coreRoutes,
  ...healthRoutes,
  ...returnsRoutes,
  ...NaldDataRoutes,
  ...CleanRoutes,
  ...PermitRoutes,
  ...CompanyDetailsRoutes,
  ...ReturnVersionsRoutes,
  ...ModLogsRoutes,
  ...ReferenceRoutes,
  ...ChargeVersionsRoutes,
  ...BillRunsRoutes,
  ...LicenceDetailsRoutes,
  ...NightlyImportRoutes
]
