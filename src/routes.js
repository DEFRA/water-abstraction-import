const coreRoutes = require('./modules/core/routes');
const returnsRoutes = require('./modules/returns/routes');
const chargingImportRoutes = require('./modules/charging-import/routes');

module.exports = [
  ...coreRoutes,
  ...returnsRoutes,
  ...chargingImportRoutes
];
