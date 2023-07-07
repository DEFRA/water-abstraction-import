'use strict'

const DeleteRemovedDocumentsJob = require('./jobs/delete-removed-documents.js')
const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicenceJob = require('./jobs/import-licence.js')

const Boom = require('@hapi/boom')

const postImport = async (request, h) => {
  const message = DeleteRemovedDocumentsJob.createMessage()

  try {
    await request.server.messageQueue.deleteQueue(DeleteRemovedDocumentsJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (error) {
    throw Boom.boomify(error)
  }
}

const postImportCompany = async (request, h) => {
  const message = ImportCompanyJob.createMessage(request.query.regionCode, request.query.partyId)

  try {
    await request.server.messageQueue.deleteQueue(ImportCompanyJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (error) {
    throw Boom.boomify(error)
  }
}

const postImportLicence = async (request, h) => {
  const message = ImportLicenceJob.createMessage(request.query.licenceNumber)

  try {
    await request.server.messageQueue.deleteQueue(ImportLicenceJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (error) {
    throw Boom.boomify(error)
  }
}

module.exports = {
  postImport,
  postImportCompany,
  postImportLicence
}
