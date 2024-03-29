'use strict'

const Boom = require('@hapi/boom')

const { buildReturnsPacket } = require('./transform-returns')
const { getLicenceJson } = require('./transform-permit')
const importLicenceJob = require('./jobs/import-licence.js')
const s3DownloadJob = require('./jobs/s3-download.js')

const { getFormats, getLogs, getLogLines } = require('./lib/nald-queries/returns')

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

/**
 * For test purposes, builds returns data
 * @param {String} request.query.filter - a JSON encoded string with property 'licenceNumber'
 */
const getReturns = async (request, h) => {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await buildReturnsPacket(filter.licenceNumber)

    if (data) {
      return data
    }
    return Boom.notFound('The requested licence number could not be found')
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query.filter - JSON encoded filter
 */
const getReturnsFormats = async (request, h) => {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await getFormats(filter.licenceNumber)

    return data
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query - JSON encoded filter
 */
const getReturnsLogs = async (request, h) => {
  try {
    const filter = JSON.parse(request.query.filter)
    const { formatId, regionCode } = filter
    const data = await getLogs(formatId, regionCode)
    return data
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query - JSON encoded filter
 */
const getReturnsLogLines = async (request, h) => {
  try {
    const filter = JSON.parse(request.query.filter)
    const { formatId, regionCode, dateFrom } = filter
    const data = await getLogLines(formatId, regionCode, dateFrom)
    return data
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

/**
 * Used to manually trigger the NALD import process
 *
 * When called it removes any existing 'nald-import.s3-download' job. The config for that job makes it a singleton,
 * which means PGBoss will only allow one of that 'job' to be queued. The existing schedule and mechanism means one
 * is always present in the queue. So, our manual trigger wouldn't work without first removing what's already there.
 */
const postImportLicences = async (request, h) => {
  const message = s3DownloadJob.createMessage(false, true)

  try {
    await request.server.messageQueue.deleteQueue(s3DownloadJob.name)
    await request.server.messageQueue.publish(message)

    return h.response().code(202)
  } catch (err) {
    throw Boom.boomify(err)
  }
}

module.exports = {
  getLicence,
  getReturns,
  getReturnsFormats,
  getReturnsLogs,
  getReturnsLogLines,
  postImportLicence,
  postImportLicences
}
