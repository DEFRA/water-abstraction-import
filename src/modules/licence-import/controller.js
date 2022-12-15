'use strict'

/**
 * @module request handlers to import all companies/licences, or selected licence or company.
 * Not used by the system (these jobs are kicked off by cron), these are used for test only.
 */

const jobs = require('./jobs')
const { logger } = require('../../logger')
const Boom = require('@hapi/boom')

const postImportHandler = async (request, h, jobCreator, errorMessage) => {
  try {
    await request.messageQueue.publish(jobCreator(request))
    return h.response({ error: null }).code(202)
  } catch (err) {
    logger.error(errorMessage, request.query)
    return Boom.badImplementation(errorMessage)
  };
}

const createImportJob = () => jobs.deleteDocuments()
const createImportCompanyJob = request => jobs.importCompany(request.query.regionCode, request.query.partyId)
const createImportLicenceJob = request => jobs.importLicence(request.query.licenceNumber)

/**
 * Import all companies/licences
 */
const postImport = (request, h) => {
  return postImportHandler(request, h, createImportJob, 'Error importing companies')
}

/**
 * Import single licence
 * @param {String} request.query.licenceNumber
 */
const postImportLicence = (request, h) => {
  return postImportHandler(request, h, createImportLicenceJob, 'Error importing licence')
}

/**
 * Import single company
 * @param {Number} request.query.regionCode
 * @param {Number} request.query.partyId
 */
const postImportCompany = (request, h) => {
  return postImportHandler(request, h, createImportCompanyJob, 'Error importing company')
}

module.exports = {
  postImport,
  postImportLicence,
  postImportCompany
}
