'use strict'

const ImportLicenceJob = require('./jobs/import-licence.js')

const Boom = require('@hapi/boom')

const postImportLicence = async (request, h) => {
  const { licenceNumber } = request.query
  const data = {
    licenceNumber,
    jobNumber: 1,
    numberOfJobs: 1
  }
  const message = ImportLicenceJob.createMessage(data)

  try {
    await request.server.messageQueue.deleteQueue(ImportLicenceJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (error) {
    throw Boom.boomify(error)
  }
}

module.exports = {
  postImportLicence
}
