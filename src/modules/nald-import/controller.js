'use strict'

const Boom = require('@hapi/boom')

const { getLicenceJson } = require('./transform-permit')
const importLicenceJob = require('./jobs/import-licence.js')

/**
 * For test purposes, builds licence from the data in the NALD import
 * tables.  This is used in the NALD import unit test
 * @param {String} request.query.filter - a JSON encoded string with property 'licenceNumber'
 */
const getLicence = async (request, h) => {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await getLicenceJson(filter.licenceNumber)

    if (data) {
      return data
    }
    return Boom.notFound('The requested licence number could not be found')
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

const postImportLicence = async (request, h) => {
  const { licenceNumber } = request.payload
  const data = {
    licenceNumber,
    jobNumber: 1,
    numberOfJobs: 1
  }
  const message = importLicenceJob.createMessage(data)

  try {
    await request.server.messageQueue.publish(message)
    return h.response().code(202)
  } catch (err) {
    throw Boom.boomify(err)
  }
}

module.exports = {
  getLicence,
  postImportLicence
}
