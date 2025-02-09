'use strict'

const Boom = require('@hapi/boom')

const QueueJob = require('./jobs/queue.js')
const ImportJob = require('./jobs/import.js')
const { getFormats, getLogLines, getLogs } = require('./lib/return-helpers.js')
const { buildReturnsPacket } = require('./lib/transform-returns.js')

async function importReturnLogs (request, h) {
  const licenceRef = request.payload?.licenceRef ?? null

  await request.messageQueue.deleteQueue(QueueJob.JOB_NAME)
  await request.messageQueue.deleteQueue(ImportJob.JOB_NAME)
  await request.messageQueue.publish(QueueJob.createMessage(false, licenceRef))

  return h.response().code(204)
}

async function replicateReturnLogs (request, h) {
  const licenceRef = request.payload?.licenceRef ?? null

  await request.messageQueue.deleteQueue(QueueJob.JOB_NAME)
  await request.messageQueue.publish(QueueJob.createMessage(true, licenceRef))

  return h.response().code(204)
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query.filter - JSON encoded filter
 */
async function returnFormats (request, h) {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await getFormats(filter.licenceNumber)

    return h.response(data).code(200)
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query - JSON encoded filter
 */
async function returnLogs (request, h) {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await getLogs(filter.formatId, filter.regionCode)

    return h.response(data).code(200)
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, gets returns formats for given licence number
 * @param {String} request.query - JSON encoded filter
 */
async function returnLogLines (request, h) {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await getLogLines(filter.formatId, filter.regionCode, filter.dateFrom)

    return h.response(data).code(200)
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

/**
 * For test purposes, builds returns data
 * @param {String} request.query.filter - a JSON encoded string with property 'licenceNumber'
 */
async function returns (request, h) {
  try {
    const filter = JSON.parse(request.query.filter)
    const data = await buildReturnsPacket(filter.licenceNumber)

    return h.response(data).code(200)
  } catch (err) {
    throw Boom.boomify(err, { statusCode: 400 })
  }
}

module.exports = {
  importReturnLogs,
  replicateReturnLogs,
  returnFormats,
  returnLogs,
  returnLogLines,
  returns
}
