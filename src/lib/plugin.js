'use strict'

/**
 * Registers subscribers in relevant environments
 * @param {Object} server - HAPI server
 * @param {Function} registerSubscribers - a function which registers subscribers on the PG boss queue
 */
const createRegister = (server, registerSubscribers) => {
  return registerSubscribers(server)
}

module.exports = {
  createRegister
}
