'use strict';

const { logger } = require('../../../logger');
const load = require('../load');

module.exports = async job => {
  try {
    logger.info('Import purpose condition types');

    // Load to data in to database
    await load.purposeConditionTypes.createPurposeConditionTypes();
  } catch (err) {
    logger.error('Import purpose condition types error', err);
    throw err;
  }
};
