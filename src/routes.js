const coreRoutes = require('./modules/core/routes');
const returnsRoutes = require('./modules/returns/routes');
const chargingImportRoutes = require('./modules/charging-import/routes');
const licenceImportRoutes = require('./modules/licence-import/routes');

module.exports = [
  ...coreRoutes,
  ...returnsRoutes,
  ...chargingImportRoutes,
  ...licenceImportRoutes
];
