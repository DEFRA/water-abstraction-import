const moment = require('moment')

/**
 * Checks whether the supplied date is within the return cycle
 * @param {Object} returnData - return row from return service
 * @param {String} date - date to test YYYY-MM-DD
 * @return {Boolean} true if within return cycle
 */
const isDateWithinReturnCycle = (returnData, date) => {
  const { start_date: startDate, end_date: endDate } = returnData
  return moment(date).isBetween(startDate, endDate, 'day', '[]')
}

module.exports = {
  isDateWithinReturnCycle
}
