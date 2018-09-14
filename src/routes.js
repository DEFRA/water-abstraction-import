const coreRoutes = require('./modules/core/routes');
const returnsRoutes = require('./modules/returns/routes');

module.exports = [
  ...coreRoutes,
  ...returnsRoutes
];
