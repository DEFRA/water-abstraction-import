'use strict'

const applicationStateService = require('../../../lib/services/application-state-service')
const deleteRemovedDocumentsJob = require('./delete-removed-documents')
const extractService = require('../services/extract-service')
const importLicenceJob = require('./import-licence')
const populatePendingImportJob = require('./populate-pending-import')
const s3Service = require('../services/s3-service')

const JOB_NAME = 'nald-import.s3-download'

function createMessage (checkEtag = true) {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    },
    data: {
      checkEtag
    }
  }
}

async function handler (job) {
  try {
    global.GlobalNotifier.omg('nald-import.s3-download: started')

    const status = await _naldFileStatus(job.data.checkEtag)

    if (status.isRequired) {
      await applicationStateService.save('nald-import', { etag: status.etag, isDownloaded: false })
      await extractService.downloadAndExtract()
      await applicationStateService.save('nald-import', { etag: status.etag, isDownloaded: true })
    }

    return status
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.s3-download: errored', error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { isRequired } = job.data.response

    if (isRequired) {
      // Delete existing PG boss import queues
      await Promise.all([
        messageQueue.deleteQueue(importLicenceJob.name),
        messageQueue.deleteQueue(deleteRemovedDocumentsJob.name),
        messageQueue.deleteQueue(populatePendingImportJob.name)
      ])

      // Publish a new job to delete any removed documents
      await messageQueue.publish(deleteRemovedDocumentsJob.createMessage())
    }
  }

  global.GlobalNotifier.omg('nald-import.s3-download: finished', job.data.response)
}

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
async function _naldFileStatus (checkEtag) {
  const etag = await s3Service.getEtag()
  let state

  try {
    state = await applicationStateService.get('nald-import')
  } catch (err) {
    state = {}
  }

  return {
    etag,
    state,
    isRequired: _isRequired(etag, state, checkEtag)
  }
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME
}
