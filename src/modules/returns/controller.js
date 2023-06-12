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
const { getVersionFilter, getEventFilter, getPagination } = require('./lib/api-helpers')

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

  const [version, linesResponse] = await Promise.all([
    _version(versionID),
    _lines(versionID)
  ])

  const returnData = await _return(version.return_id)
  const linesTransformer = _linesTransformer(returnData)
  const linesData = version.nil_return ? generateNilLines(returnData, version) : linesResponse
  const lines = linesData.flatMap(linesTransformer)

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
}

/**
 * Gets all the current versions that have a created_date
 * after the 'start' query params.
 *
 * Can optionally supply an 'end' query param to cap the range.
 */
const getVersions = async (request, h) => {
  const filter = getVersionFilter(request)
  const pagination = getPagination(request)

  return versions.findMany(filter, {}, pagination, ['version_id', 'return_id', 'nil_return'])
}

/**
 * Gets returns where a return.status event has been recorded within a
 * certain date range
 */
const getReturns = async (request, _h) => {
  const filter = getEventFilter(request)
  const pagination = getPagination(request)

  const response = await events.findMany(filter, {}, pagination, ['metadata->>returnId'])
  const tasks = response.data.map(row => _fetchReturn(row))

  response.data = await Promise.all(tasks)

  return response
}

const _fetchReturn = async (row) => {
  const returnId = row['?column?']
  const data = await _return(returnId)
  return transformReturn(data, ['return_id'])
}

const _firstItemOrNotFound = (id, { data }) => {
  if (data.length === 0) {
    throw Boom.notFound(`Data not found for ${id}`)
  }

  return data[0]
}

const _lines = async versionId => {
  const filter = { version_id: versionId }
  const pagination = { perPage: 2000 }
  const { data } = await lines.findMany(filter, {}, pagination)

  return data
}

const _linesTransformer = returnData => {
  return returnData.returns_frequency === 'week'
    ? transformWeeklyLine
    : transformLine
}

const _return = async returnId => {
  const response = await returns.findMany({ return_id: returnId })

  return _firstItemOrNotFound(returnId, response)
}

const _version = async versionId => {
  const response = await versions.findMany({ version_id: versionId })

  return _firstItemOrNotFound(versionId, response)
}

module.exports = {
  getLinesForVersion,
  getVersions,
  getReturns
}
