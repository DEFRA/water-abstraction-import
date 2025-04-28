'use strict'

/**
 * Helpers for dealing with return cycles
 * @module ReturnCycleHelpers
 */

const db = require('../../../lib/connectors/db.js')

/**
 * Fetches all the return cycles in WRLS split by summer and winter (all-year)
 *
 * We get all the return cycles as a one time request. Then as we persist each return log we match them to what we've
 * fetched so that we have the return cycle ID.
 *
 * As a nod to performance, we know a return log will either be summer or winter. So, rather than comparing it to _all_
 * the return cycles, by splitting them here we can compare the return log to just those that match its cycle type.
 *
 * @returns {Promise<object>} an object containing all the return cycles split by summer and winter
 */
async function fetch () {
  const returnCycles = await db.query(`
    SELECT
      end_date,
      is_summer,
      return_cycle_id,
      start_date
    FROM
      "returns".return_cycles rc
    ORDER BY
      rc.start_date
  `)

  const summerCycles = []
  const winterCycles = []

  for (const returnCycle of returnCycles) {
    if (returnCycle.is_summer) {
      summerCycles.push(returnCycle)
      continue
    }

    winterCycles.push(returnCycle)
  }

  return { summer: summerCycles, winter: winterCycles }
}

function match (returnCycles, returnLog) {
  // TODO: For some reason the metadata for return logs that start before 2018-10-31 is passed to persistReturns() as
  // JSON, and for the rest it's an Object. If we can track it down there is no reason why all rows should not have
  // object based metadata. Till then we have this!
  const summer = returnLog.metadata instanceof Object ? returnLog.metadata.isSummer : JSON.parse(returnLog.metadata).isSummer

  const comparisonReturnCycles = summer ? returnCycles.summer : returnCycles.winter

  return comparisonReturnCycles.find((returnCycle) => {
    // NOTE: The pg library returns postgresql `date` as string and `datetime` as a date object. We _could_ convert the
    // values to dates, then compare `getTime()` to ensure we are comparing the dates and not the object references.
    // However, we know the string representations are formatted as YYYY-MM-DD, which means a straight forward
    // string comparison will work and we can avoid the step of converting to dates, then determining their times.
    //
    // If we were getting the dates as held in the import tables (DD-MM-YYYY) then it we would have to convert them.
    const startDateMatch = returnLog.start_date >= returnCycle.start_date
    const endDateMatch = returnLog.end_date <= returnCycle.end_date

    return startDateMatch && endDateMatch
  })
}

module.exports = {
  fetch,
  match
}
