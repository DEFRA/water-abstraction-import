'use strict'

const ImportCompanyJob = require('./jobs/import-company.js')
const ImportLicenceJob = require('./jobs/import-licence.js')

const Boom = require('@hapi/boom')

const postImportCompany = async (request, h) => {
  const { regionCode, partyId } = request.query
  const data = {
    regionCode,
    partyId,
    jobNumber: 1,
    numberOfJobs: 1
  }
  const message = ImportCompanyJob.createMessage(data)

  try {
    await request.server.messageQueue.deleteQueue(ImportCompanyJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (error) {
    throw Boom.boomify(error)
  }
}

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
  postImportCompany,
  postImportLicence
}
