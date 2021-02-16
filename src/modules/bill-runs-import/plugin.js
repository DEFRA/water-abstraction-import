'use strict';

const routes = require('./routes');
const importer = require('./lib/import');
const constants = require('./lib/constants');

exports.plugin = {
  name: 'importBillRunData',
  dependencies: ['pgBoss'],
  register: async server => {
    // Register routes
    server.route(routes);

    // Register PG boss job
    await server.messageQueue.subscribe(constants.IMPORT_BILL_RUNS, {}, importer.importBillRuns);
  }
};
