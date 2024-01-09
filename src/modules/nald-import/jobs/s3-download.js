'use strict'

const applicationStateService = require('../../../lib/services/application-state-service.js')
const DeleteRemovedDocumentsJob = require('./delete-removed-documents.js')
const extractService = require('../services/extract-service.js')
const ImportLicenceJob = require('./import-licence.js')
const QueueLicences = require('./queue-licences')
const s3Service = require('../services/s3-service.js')

const JOB_NAME = 'nald-import.s3-download'

function createMessage (checkEtag = true, replicateReturns = false) {
  return {
    name: JOB_NAME,
    options: {
      expireIn: '1 hours',
      singletonKey: JOB_NAME
    },
    data: {
      checkEtag,
      replicateReturns
    }
  }
}

async function handler (job) {
  try {
    global.GlobalNotifier.omg(`${JOB_NAME}: started`)

    const status = await _naldFileStatus(job.data.checkEtag)

    if (status.isRequired) {
      await applicationStateService.save('nald-import', { etag: status.etag, isDownloaded: false })
      await extractService.downloadAndExtract()
      await applicationStateService.save('nald-import', { etag: status.etag, isDownloaded: true })
    }

    return status
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue, job) {
  if (!job.failed) {
    const { isRequired } = job.data.response

    if (isRequired) {
      // Delete existing PG boss import queues
      await Promise.all([
        messageQueue.deleteQueue(ImportLicenceJob.name),
        messageQueue.deleteQueue(DeleteRemovedDocumentsJob.name),
        messageQueue.deleteQueue(QueueLicences.name)
      ])

      // Publish a new job to delete any removed documents
      await messageQueue.publish(DeleteRemovedDocumentsJob.createMessage())
    }
  }

  global.GlobalNotifier.omg(`${JOB_NAME}: finished`, job.data.response)
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
