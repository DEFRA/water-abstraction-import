// provides all API services consumed by VML and VML Admin front ends
require('dotenv').config();

// -------------- Require vendor code -----------------
const Blipp = require('blipp');
const Good = require('good');
const GoodWinston = require('good-winston');
const Hapi = require('hapi');
const HapiAuthJwt2 = require('hapi-auth-jwt2');
const moment = require('moment');
moment.locale('en-gb');

// -------------- Require project code -----------------
const config = require('./config');
const routes = require('./src/routes.js');

// Initialise logger
const { logger } = require('./src/logger');
const goodWinstonStream = new GoodWinston({ winston: logger });

// Initialise cron jobs
require('./src/cron.js');

// Define server
const server = Hapi.server(config.server);

const registerServerPlugins = async (server) => {
  // Third-party plugins
  await server.register({
    plugin: Good,
    options: {
      ...config.good,
      reporters: {
        winston: [goodWinstonStream]
      }
    }
  });
  await server.register({
    plugin: Blipp,
    options: config.blipp
  });

  // JWT token auth
  await server.register(HapiAuthJwt2);
};

const configureServerAuthStrategy = (server) => {
  server.auth.strategy('jwt', 'jwt', {
    ...config.jwt,
    validate: async (decoded) => ({ isValid: !!decoded.id })
  });
  server.auth.default('jwt');
};

const start = async function () {
  try {
    await registerServerPlugins(server);
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

process.on('unhandledRejection', (err) => {
  logger.error(err);
  process.exit(1);
});

start();

module.exports = server;
