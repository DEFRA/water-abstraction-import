'use strict'

const Boom = require('@hapi/boom')
const { lines, returns, versions } = require('../../lib/connectors/returns')
const { events } = require('../../lib/connectors/water/events')
const {
  transformReturn,
  transformWeeklyLine,
  transformLine,
  filterLines
} = require('./lib/transformers')
const { generateNilLines } = require('./lib/generate-nil-lines')
const { flatMap } = require('lodash')
const { logger } = require('../../logger')

const { getVersionFilter, getEventFilter, getPagination } = require('./lib/api-helpers')

/**
 * Gets all the current versions that have a created_date
 * after the 'start' query params.
 *
 * Can optionally supply an 'end' query param to cap the range.
 */
const getVersions = async (request, h) => {
  try {
    const filter = getVersionFilter(request)
    const pagination = getPagination(request)
    return versions.findMany(filter, {}, pagination, ['version_id', 'return_id', 'nil_return'])
  } catch (err) {
    logger.error('getVersions error', err.stack)
    throw err
  }
}

const firstItemOrNotFound = (id, { data }) => {
  if (data.length === 0) {
    throw Boom.notFound(`Data not found for ${id}`)
  }
  return data[0]
}

const getVersion = async versionId => {
  const response = await versions.findMany({ version_id: versionId })
  return firstItemOrNotFound(versionId, response)
}

const getReturn = async returnId => {
  const response = await returns.findMany({ return_id: returnId })
  return firstItemOrNotFound(returnId, response)
}

const getLines = async versionId => {
  const filter = { version_id: versionId }
  const pagination = { perPage: 2000 }
  const { data } = await lines.findMany(filter, {}, pagination)
  return data
}

const getLinesTransformer = returnData => {
  return returnData.returns_frequency === 'week'
    ? transformWeeklyLine
    : transformLine
}

/**
 * Gets an object containing all line information for a given
 * version id.
 *
 * Will convert weekly data to daily data to allow consumption
 * by NALD which does not have a strict concept of weekly data
 * and instead saves daily data.
 */
const getLinesForVersion = async (request, h) => {
  const { versionID } = request.params

  try {
    const [version, linesResponse] = await Promise.all([
      getVersion(versionID),
      getLines(versionID)
    ])

    const returnData = await getReturn(version.return_id)
    const linesTransformer = getLinesTransformer(returnData)
    const linesData = version.nil_return ? generateNilLines(returnData, version) : linesResponse
    const lines = flatMap(linesData, linesTransformer)

    return {
      error: null,
      data: {
        nil_return: version.nil_return,
        under_query: false,
        under_query_comment: '',
        return: transformReturn(returnData),
        lines: filterLines(returnData, lines)
      }
    }
  } catch (err) {
    logger.error('getLinesForVersion error', err.stack)
    throw err
  }
}

const fetchReturn = async (row) => {
  const returnId = row['?column?']
  const data = await getReturn(returnId)
  return transformReturn(data, ['return_id'])
}

/**
 * Gets returns where a return.status event has been recorded within a
 * certain date range
 */
const getReturns = async (request, h) => {
  try {
    const filter = getEventFilter(request)
    const pagination = getPagination(request)

    const response = await events.findMany(filter, {}, pagination, ['metadata->>returnId'])

    const tasks = response.data.map(row => fetchReturn(row))

    response.data = await Promise.all(tasks)
    return response
  } catch (err) {
    logger.error('getReturns error', err.stack)
    throw err
  }
}

module.exports = {
  getVersions,
  getLinesForVersion,
  getReturns
}
