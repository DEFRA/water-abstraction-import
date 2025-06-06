'use strict'

/**
 * Computes a new daily date from a return submission line's start date and checks it is within the return period
 *
 * We have to convert each WRLS weekly return submission line into 7 daily ones as that is how NALD holds the data.
 * Part of this is working out a 'daily' date, that will be used for the new line's start and end date.
 *
 * Starting with the weekly line's start date, we iterate from 0 to 6 days forward from it to generate each 'daily'
 * date.
 *
 * As a final complication, a weekly line might have a start date outside of the return period. It is when the week ends
 * (the Saturday) that determines whether a 'week' is within one return period or another. So, having a start date
 * that falls outside of it is to be expected.
 *
 * We don't want to generate 'daily' lines for these dates, hence we check the computed 'daily' date against the
 * return's start date (and it's end date _just in case_!), and return `null` if it is less.
 *
 * @param {string} returnStart - returns period start date
 * @param {string} returnEnd - returns period end date
 * @param {string} lineStart - return submission line's start date
 * @param {number} numDaysForward - The number of days to move forward from the line's start date.
 *
 * @returns {string|null} The computed date in 'YYYY-MM-DD' format or null if outside the cycle.
 */
function go (returnStart, returnEnd, lineStart, numDaysForward) {
  const returnStartDate = new Date(returnStart)
  const returnEndDate = new Date(returnEnd)
  const dailyDate = new Date(lineStart)

  dailyDate.setDate(dailyDate.getDate() + numDaysForward)

  if (dailyDate < returnStartDate || dailyDate > returnEndDate) {
    return null
  }

  return dailyDate.toISOString().split('T')[0]
}

module.exports = {
  go
}
