'use strict';

const { logger } = require('../logger');

/**
 * Registers subscribers in relevant environments
 * @param {Object} server - HAPI server
 * @param {Function} registerSubscribers - a function which registers subscribers on the PG boss queue
 */
const createRegister = (server, registerSubscribers) => {
  if (process.env.TRAVIS) {
    logger.info('Abort register of subscribers in Travis environment');
    return;
  }
  return registerSubscribers(server);
};

exports.createRegister = createRegister;
