'use strict'

function daysFromPeriod (periodStartDate, periodEndDate) {
  const days = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Clone the date again for the same reason above
    const startDate = _cloneDate(clonedPeriodStartDate)

    // No jiggery-pokery needed. Simply add it to the days array as both the start and end date
    days.push({ start_date: startDate, end_date: startDate })

    // Move the date to the next day, and round we go again!
    clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 1)
  }

  return days
}

function weeksFromPeriod (periodStartDate, periodEndDate) {
  const weeks = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Is the date a Saturday?
    if (clonedPeriodStartDate.getDay() === 6) {
      // Yes! Clone the date again for the same reason above
      const endDate = _cloneDate(clonedPeriodStartDate)
      const startDate = _cloneDate(clonedPeriodStartDate)

      // Set the start date back to 6 days, which makes it the previous Sunday
      startDate.setDate(startDate.getDate() - 6)

      weeks.push({ start_date: startDate, end_date: endDate })

      // Now we have found our first week, we can just move the date forward by 6 days to the next Saturday, thus saving
      // a bunch of loop iterations
      clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 6)
    } else {
      // Move the date to the next day, and try again!
      clonedPeriodStartDate.setDate(clonedPeriodStartDate.getDate() + 1)
    }
  }

  return weeks
}

function monthsFromPeriod (periodStartDate, periodEndDate) {
  const months = []

  // We have to clone the date, else as we increment in the loop we'd be incrementing the param passed in!
  const clonedPeriodStartDate = _cloneDate(periodStartDate)

  while (clonedPeriodStartDate <= periodEndDate) { // eslint-disable-line
    // Bump the returnLogStartDate to the next month, for example 2013-04-15 becomes 2013-05-15
    clonedPeriodStartDate.setMonth(clonedPeriodStartDate.getMonth() + 1)

    // Then clone that for our end date. "But we want the last day in April!?" we hear you scream :-)
    const endDate = _cloneDate(clonedPeriodStartDate)

    // We use some JavaScript magic to move endDate back to the last of the month. By setting the date (the 01, 02, 03
    // etc part) to 0, it's the equivalent of setting it to the 1st, then asking JavaScript to minus 1 day. That's
    // how we get to 2013-04-30. It also means we don't need to worry about which months have 30 vs 31 days, or whether
    // we are in a leap year!
    endDate.setDate(0)

    // Set start date to first of the month. Passing it in as a string to new Date() helps keep it UTC rather than local
    const startDate = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-01`)

    months.push({ start_date: startDate, end_date: endDate })
  }

  return months
}

function _cloneDate (dateToClone) {
  const year = dateToClone.getFullYear()
  const month = dateToClone.getMonth() + 1
  const day = dateToClone.getDate()

  return new Date(`${year}-${month}-${day}`)
}

module.exports = {
  daysFromPeriod,
  weeksFromPeriod,
  monthsFromPeriod
}
