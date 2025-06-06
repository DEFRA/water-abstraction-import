'use strict'

const moment = require('moment')

const InAbstractionPeriod = require('./in-abstraction-period.js')

const SATURDAY = 6

/**
 * Generates lines for inclusion in the API response when the return submission is a nil return
 *
 * In WRLS a 'nil return' (nothing abstracted) is simply recorded as a boolean flag against the return submission. This
 * is because the return submission and its lines are not created _until_ the return is submitted.
 *
 * In NALD the return submission is created _before_ the return is submitted. This means it generates the lines first.
 * When a nil return was recorded in NALD, these lines were just left blank.
 *
 * Now they are submitted in WRLS, we are obliged to respond with lines even though they don't exist in WRLS. so that
 * the FME job that uses the API can update NALD correctly.
 *
 * > BTW, not creating all these blank lines avoids storing almost 20 million records unnecessarily!
 *
 * To further complicate matters, NALD stores weekly return submissions in the same way it stores daily. The only
 * difference is that the quantity gets assigned to whichever daily is the Saturday for that week (the weekend).
 *
 * On top of that, users are expected to only record their submissions against lines within the return logs abstraction
 * period. So, when we generate these nil lines, we're expected to do the same and only assign '0' to those that
 * fall within the return log's abstraction period.
 *
 * @param {object} returnSubmission - return submission (plus some details from the return log) fetched by
 * `VersionLines`
 *
 * @return {object[]} the generated nil lines ready for inclusion in the API response
 */
function go (returnSubmission) {
  const { start_date, end_date, returns_frequency } = returnSubmission

  if (returns_frequency === 'year') {
    return _yearlyLines(start_date, end_date)
  }

  if (returns_frequency === 'month') {
    return _monthlyLines(start_date, end_date, returnSubmission)
  }

  return _dailyLines(start_date, end_date, returnSubmission)
}

function _dailyLines (startDate, endDate, returnSubmission) {
  const { returns_frequency } = returnSubmission
  const lines = []
  const datePtr = moment(startDate).locale('en')

  do {
    const inAbsPeriod = _inAbstractionPeriod(datePtr.format('YYYY-MM-DD'), returnSubmission)

    lines.push({
      start_date: datePtr.format('YYYY-MM-DD'),
      end_date: datePtr.format('YYYY-MM-DD'),
      time_period: 'day',
      reading_type: 'measured',
      unit: 'm³',
      user_unit: 'm³',
      quantity: _dailyOrwWeeklyQuantity(datePtr, inAbsPeriod, returns_frequency),
      nald_reading_type: 'M',
      nald_time_period: 'D',
      nald_units: 'M'
    })
    datePtr.add(1, 'day')
  }
  while (datePtr.isSameOrBefore(endDate, 'day'))

  return lines
}

function _dailyOrwWeeklyQuantity (lineDate, inAbsPeriod, frequency) {
  // If not in the return's abstraction period always return null for a nil return
  if (!inAbsPeriod) {
    return null
  }

  // If the return frequency is not 'weekly', assume daily and return 0
  if (frequency !== 'week') {
    return '0'
  }

  // Only return 0 on weekly nil return lines if the day is a Saturday
  if (lineDate.day() === SATURDAY) {
    return '0'
  }

  return null
}

function _inAbstractionPeriod(dateToCheck, returnSubmission) {
  const {
    abs_period_end_day,
    abs_period_end_month,
    abs_period_start_day,
    abs_period_start_month
  } = returnSubmission

  return InAbstractionPeriod.go(
    dateToCheck,
    abs_period_start_day,
    abs_period_start_month,
    abs_period_end_day,
    abs_period_end_month
  )
}

function _monthlyLines (startDate, endDate, returnSubmission) {
  const lines = []
  const datePtr = moment(startDate).locale('en')

  do {
    const inAbsPeriod = _inAbstractionPeriod(datePtr.endOf('month').format('YYYY-MM-DD'), returnSubmission)

    lines.push({
      start_date: datePtr.startOf('month').format('YYYY-MM-DD'),
      end_date: datePtr.endOf('month').format('YYYY-MM-DD'),
      time_period: 'month',
      reading_type: 'measured',
      unit: 'm³',
      user_unit: 'm³',
      quantity: inAbsPeriod ? 0 : null,
      nald_reading_type: 'M',
      nald_time_period: 'M',
      nald_units: 'M'
    })
    datePtr.add(1, 'month')
  }
  while (datePtr.isSameOrBefore(endDate, 'month'))

  return lines
}

function _yearlyLines (startDate, endDate) {
  return [{
    start_date: startDate,
    end_date: endDate,
    time_period: 'year',
    reading_type: 'measured',
    unit: 'm³',
    user_unit: 'm³',
    quantity: 0,
    nald_reading_type: 'M',
    nald_time_period: 'Y',
    nald_units: 'M'
  }]
}

module.exports = {
  go
}
