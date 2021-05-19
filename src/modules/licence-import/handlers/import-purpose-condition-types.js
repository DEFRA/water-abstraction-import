'use strict';

const { logger } = require('../../../logger');
const purposeConditionsConnector = require('../connectors/purpose-conditions-types');

module.exports = async () => {
  try {
    logger.info('Import purpose condition types');
    // Load to data in to database
    return purposeConditionsConnector.createPurposeConditionTypes();
  } catch (err) {
    logger.error('Import purpose condition types error', err);
    throw err;
  }
};
