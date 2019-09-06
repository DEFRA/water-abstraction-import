const coreRoutes = require('./modules/core/routes');
const returnsRoutes = require('./modules/returns/routes');
const chargingImportRoutes = require('./modules/charging-import/routes');
const crmImportRoutes = require('./modules/crm/routes');

module.exports = [
  ...coreRoutes,
  ...returnsRoutes,
  ...chargingImportRoutes,
  ...crmImportRoutes
];
