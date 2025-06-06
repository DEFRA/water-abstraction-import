'use strict'

const moment = require('moment')

  /**
   * Determines if a given date is within a given abstraction period.
   *
   * The abstraction period is defined by its start and end days and months.
   * The period can span across two calendar years.
   *
   * @param {Date|string} dateToCheck - Date to check
   * @param {number} startDay - Day of abstraction period start
   * @param {number} startMonth - Month of abstraction period start
   * @param {number} endDay - Day of abstraction period end
   * @param {number} endMonth - Month of abstraction period end
   *
   * @returns {boolean} - True if date is within abstraction period, otherwise false
   */
function go (dateToCheck, startDay, startMonth, endDay, endMonth) {
  // Month and day of test date
  const month = moment(dateToCheck).locale('en').month() + 1
  const day = moment(dateToCheck).locale('en').date()

  // Period start date is >= period end date
  if (_sameOrAfter(endDay, endMonth, startDay, startMonth)) {
    return _sameOrAfter(day, month, startDay, startMonth) && _sameOrBefore(day, month, endDay, endMonth)
  } else {
    const prevYear = _sameOrAfter(day, month, 1, 1) && _sameOrBefore(day, month, endDay, endMonth)
    const thisYear = _sameOrAfter(day, month, startDay, startMonth) && _sameOrBefore(day, month, 31, 12)

    return prevYear || thisYear
  }
}

function _sameOrAfter (day, month, refDay, refMonth) {
  if (month > refMonth) {
    return true
  }

  return ((month === refMonth) && (day >= refDay))
}

function _sameOrBefore (day, month, refDay, refMonth) {
  if (month < refMonth) {
    return true
  }

  return (month === refMonth) && (day <= refDay)
}

module.exports = {
  go
}
