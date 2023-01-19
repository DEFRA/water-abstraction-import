'use strict'

const applicationStateService = require('../../../lib/services/application-state-service')
const s3Service = require('../services/s3-service')
const extractService = require('../services/extract-service')
const logger = require('./lib/logger')
const config = require('../../../../config')
const constants = require('../lib/constants')

const JOB_NAME = 'nald-import.s3-download'

const createMessage = licenceNumber => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
})

/**
 * Checks whether the file etag has changed
 * If the check is disabled via the config file (in order to force import) this always returns true
 * @param {String} etag
 * @param {Object} state
 * @return {Boolean}
 */
const isNewEtag = (etag, state) => {
  const isEtagCheckEnabled = config?.import?.nald?.isEtagCheckEnabled ?? true
  if (isEtagCheckEnabled) {
    return etag !== state.etag
  }
  return true
}

/**
 * Gets status of file in S3 bucket and current application state
 * @return {Promise<Object>}
 */
const getStatus = async () => {
  const etag = await s3Service.getEtag()
  let state

  try {
    state = await applicationStateService.get(constants.APPLICATION_STATE_KEY)
  } catch (err) {
    state = {}
  }

  return {
    etag,
    state,
    isRequired: !state.isDownloaded || isNewEtag(etag, state)
  }
}

/**
 * Imports a single licence
 * @param {Object} job
 * @param {String} job.data.licenceNumber
 */
const handler = async job => {
  logger.logHandlingJob(job)

  try {
    const status = await getStatus()

    if (status.isRequired) {
      await applicationStateService.save(constants.APPLICATION_STATE_KEY, { etag: status.etag, isDownloaded: false })
      await extractService.downloadAndExtract()
      await applicationStateService.save(constants.APPLICATION_STATE_KEY, { etag: status.etag, isDownloaded: true })
    }

    return status
  } catch (err) {
    logger.logJobError(job, err)
    throw err
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
