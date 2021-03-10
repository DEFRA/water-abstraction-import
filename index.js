// provides all API services consumed by VML and VML Admin front ends
require('dotenv').config();

// -------------- Require vendor code -----------------
const Blipp = require('blipp');
const Good = require('@hapi/good');
const GoodWinston = require('good-winston');

const HapiAuthJwt2 = require('hapi-auth-jwt2');
const moment = require('moment');

moment.locale('en-gb');

// -------------- Shared code --------------------------
const helpers = require('@envage/water-abstraction-helpers');

// -------------- Require project code -----------------
const config = require('./config');
const routes = require('./src/routes.js');
const db = require('./src/lib/connectors/db');

// Initialise logger
const { logger } = require('./src/logger');
const goodWinstonStream = new GoodWinston({ winston: logger });

// Define server
const server = require('./server');

const plugins = [
  {
    plugin: Good,
    options: {
      ...config.good,
      reporters: {
        winston: [goodWinstonStream]
      }
    }
  },
  {
    plugin: Blipp,
    options: config.blipp
  },
  HapiAuthJwt2,
  {
    plugin: helpers.hapiPgBoss,
    options: {
      ...config.pgBoss,
      db: {
        executeSql: (...args) => db.pool.query(...args)
      }
    }
  },
  require('./src/modules/licence-import/plugin'),
  require('./src/modules/charging-import/plugin'),
  require('./src/modules/nald-import/plugin'),
  require('./src/modules/bill-runs-import/plugin')
];

const configureServerAuthStrategy = (server) => {
  server.auth.strategy('jwt', 'jwt', {
    ...config.jwt,
    validate: async (decoded) => ({ isValid: !!decoded.id })
  });
  server.auth.default('jwt');
};

const start = async function () {
  try {
    await server.register(plugins);
    configureServerAuthStrategy(server);
    server.route(routes);

    if (!module.parent) {
      await server.start();
      const name = process.env.SERVICE_NAME;
      const uri = server.info.uri;
      server.log('info', `Service ${name} running at: ${uri}`);
    }
  } catch (err) {
    logger.error(err);
  }
};

const processError = message => err => {
  logger.error(message, err);
  process.exit(1);
};

process
  .on('unhandledRejection', processError('unhandledRejection'))
  .on('uncaughtException', processError('uncaughtException'))
  .on('SIGINT', async () => {
    logger.info('Stopping import service');

    await server.stop();
    logger.info('1/3: Hapi server stopped');

    await server.messageQueue.stop();
    logger.info('2/3: Message queue stopped');
    logger.info('Waiting 5 secs to allow pg-boss to finish');

    setTimeout(async () => {
      await db.pool.end();
      logger.info('3/3: Connection pool closed');

      return process.exit(0);
    }, 5000);
  });

start();

module.exports = server;
