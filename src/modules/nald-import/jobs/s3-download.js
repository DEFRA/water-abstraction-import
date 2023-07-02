'use strict'

const applicationStateService = require('../../../lib/services/application-state-service')
const constants = require('../lib/constants')
const extractService = require('../services/extract-service')
const s3Service = require('../services/s3-service')

const JOB_NAME = 'nald-import.s3-download'

const createMessage = (checkEtag = true) => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  },
  data: {
    checkEtag
  }
})

function _isRequired (etag, state, checkEtag) {
  if (!state.isDownloaded) {
    return true
  }

  if (!checkEtag) {
    return true
  }

  return etag !== state.etag
}

/**
 * Gets status of file in S3 bucket and current application state
 * @return {Promise<Object>}
 */
const getStatus = async (checkEtag) => {
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
    isRequired: _isRequired(etag, state, checkEtag)
  }
}

const handler = async (job) => {
  try {
    global.GlobalNotifier.omg('nald-import.s3-download: started')

    const status = await getStatus(job.data.checkEtag)

    if (status.isRequired) {
      await applicationStateService.save(constants.APPLICATION_STATE_KEY, { etag: status.etag, isDownloaded: false })
      await extractService.downloadAndExtract()
      await applicationStateService.save(constants.APPLICATION_STATE_KEY, { etag: status.etag, isDownloaded: true })
    }

    return status
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.s3-download: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
