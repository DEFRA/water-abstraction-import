/**
 * Gets filter for API request to return versions endpoint
 * @param {String} request.query.start - ISO 8601 date, e.g. 2018-10-01
 * @param {String} [request.query.end] - ISO 8601 date, e.g. 2018-10-01
 * @return {Object} filter object for HAPI rest API
 */
const getVersionFilter = (request) => {
  const { start, end } = request.query
  const filter = {
    current: true,
    created_at: { $gte: start },
    user_id: { $ne: 'imported.from@nald.gov.uk' }
  }

  if (end) {
    filter.created_at.$lte = end
  }

  return filter
}

/**
 * Gets pagination object for HAPI rest API
 * @param {Number} [request.pagination.perPage] - number of rows per page
 * @param {Number} [request.pagination.page] - the page of the result set to return
 * @return {Object} pagination object for HAPI rest API
 */
const getPagination = (request) => {
  return Object.assign({ perPage: 2000, page: 1 }, request.query.pagination)
}

module.exports = {
  getVersionFilter,
  getPagination
}
