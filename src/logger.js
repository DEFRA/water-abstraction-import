const config = require('../config')
const { createLogger } = require('@envage/water-abstraction-helpers').logger

const logger = createLogger(config.logger)

module.exports = {
  logger
}
