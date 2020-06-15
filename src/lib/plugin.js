'use strict';

const isImportTarget = require('./is-import-target');
const { logger } = require('../logger');

/**
 * Registers subscribers in relevant environments
 * @param {Object} server - HAPI server
 * @param {Function} registerSubscribers - a function which registers subscribers on the PG boss queue
 */
const createRegister = (server, registerSubscribers) => {
  if (!isImportTarget()) {
    logger.info(`Aborting import, environment is: ${process.env.NODE_ENV}`);
    return;
  }

  if (process.env.TRAVIS) {
    logger.info('Abort register of subscribers in Travis environment');
    return;
  }
  return registerSubscribers(server);
};

exports.createRegister = createRegister;
