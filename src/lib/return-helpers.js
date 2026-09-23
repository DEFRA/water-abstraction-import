'use strict'

const DECEMBER = 11

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

  let year = periodStartDate.getFullYear()
  let month = periodStartDate.getMonth() // 0-indexed (0 = January)

  const endYear = periodEndDate.getFullYear()
  const endMonth = periodEndDate.getMonth()

  // Loop while the current year/month has not passed the period's final month
  while (year < endYear || (year === endYear && month <= endMonth)) {
    // First day of the current month
    const startDate = new Date(Date.UTC(year, month, 1))

    // Last day of the current month. Asking for day 0 of the *next* month rolls back to the last day of this one,
    // so we never have to worry about 28/29/30/31-day months or leap years
    const endDate = new Date(Date.UTC(year, month + 1, 0))

    months.push({ startDate, endDate })

    // Advance to the next month, rolling into January of the next year when needed
    month++
    if (month > DECEMBER) {
      month = 0
      year++
    }
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
