'use strict';

const { get } = require('lodash');
const applicationStateService = require('../services/application-state-service');
const s3Service = require('../services/s3-service');
const extractService = require('../services/extract-service');
const logger = require('./lib/logger');
const config = require('../../../../config');

const JOB_NAME = 'nald-import.s3-download';

const createMessage = licenceNumber => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
});

/**
 * Checks whether the file etag has changed
 * If the check is disabled via the config file (in order to force import) this always returns true
 * @param {String} etag
 * @param {Object} state
 * @return {Boolean}
 */
const isNewEtag = (etag, state) => {
  const isEtagCheckEnabled = get(config, 'import.nald.isEtagCheckEnabled', true);
  console.log({ isEtagCheckEnabled, etag, state });
  if (isEtagCheckEnabled) {
    return etag !== state.etag;
  }
  return true;
};

/**
 * Gets status of file in S3 bucket and current application state
 * @return {Promise<Object>}
 */
const getStatus = async () => {
  const etag = await s3Service.getEtag();
  let state;

  try {
    state = await applicationStateService.get();
  } catch (err) {
    state = {};
  }

  return {
    etag,
    state,
    isRequired: !state.isDownloaded || isNewEtag(etag, state)
  };
};

/**
 * Imports a single licence
 * @param {Object} job
 * @param {String} job.data.licenceNumber
 */
const handler = async job => {
  logger.logHandlingJob(job);

  try {
    const status = await getStatus();

    if (status.isRequired) {
      await applicationStateService.save(status.etag);
      await extractService.downloadAndExtract();
      await applicationStateService.save(status.etag, true);
    }

    return status;
  } catch (err) {
    logger.logJobError(job, err);
    throw err;
  }
};

exports.createMessage = createMessage;
exports.handler = handler;
exports.jobName = JOB_NAME;
