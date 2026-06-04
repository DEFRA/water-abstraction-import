'use strict'

const { daysFromPeriod, weeksFromPeriod, monthsFromPeriod } = require('../../../lib/return-helpers.js')

function go (missingVoidReturnLines) {
  const missingReturns = _processLines(missingVoidReturnLines)

  _assignNaldLines(missingReturns)

  return Object.values(missingReturns)
}

function _assignNaldLines (missingReturns) {
  for (const missingReturn of Object.values(missingReturns)) {
    const { naldLines } = missingReturn

    for (const naldLine of naldLines) {
      const line = missingReturn.lines.find((line) => {
        const onOrAfterStartDate = line.start_date <= naldLine.returnDate
        const onOrBeforeEndDate = line.end_date >= naldLine.returnDate

        return onOrAfterStartDate && onOrBeforeEndDate
      })

      if (line) {
        if (line.qty) {
          line.qty += naldLine.qty
        } else {
          line.qty = naldLine.qty
        }
      }
    }
  }
}

function _processLines (missingVoidReturnLines) {
  const missingReturns = {}

  for (const missingVoidReturnLine of missingVoidReturnLines) {
    if (missingReturns[missingVoidReturnLine.id]) {

      missingReturns[missingVoidReturnLine.id].naldLines.push({
        returnDate: missingVoidReturnLine.return_date,
        qty: missingVoidReturnLine.return_qty
      })

      continue
    }

    const startDate = new Date(missingVoidReturnLine.return_cycle_start_date)
    const endDate = new Date(missingVoidReturnLine.return_cycle_end_date)
    const dueDate = new Date(missingVoidReturnLine.return_cycle_due_date)

    missingReturns[missingVoidReturnLine.id] = {
      licenceRef: missingVoidReturnLine.licence_ref,
      lines: _lines(missingVoidReturnLine.reporting_frequency, startDate, endDate),
      naldLines: [{
        returnDate: new Date(missingVoidReturnLine.return_date),
        qty: Number(missingVoidReturnLine.return_qty)
      }],
      returnRequirement: {
        abstractionPeriod: {
          startDay: missingVoidReturnLine.abstraction_period_start_day,
          startMonth: missingVoidReturnLine.abstraction_period_start_month,
          endDay: missingVoidReturnLine.abstraction_period_end_day,
          endMonth: missingVoidReturnLine.abstraction_period_end_month
        },
        areaCode: missingVoidReturnLine.area_code,
        id: missingVoidReturnLine.return_requirement_id,
        multipleUpload: missingVoidReturnLine.water_undertaker,
        reference: missingVoidReturnLine.format_id,
        reportingFrequency: missingVoidReturnLine.reporting_frequency,
        returnVersionId: missingVoidReturnLine.return_version_id,
        siteDescription: missingVoidReturnLine.site_description,
        summer: missingVoidReturnLine.summer,
        twoPartTariff: missingVoidReturnLine.two_part_tariff
      },
      regionId: missingVoidReturnLine.region_id,
      returnCycle: {
        id: missingVoidReturnLine.return_cycle_id,
        startDate,
        endDate,
        dueDate,
      },
      returnLog: {
        id: missingVoidReturnLine.return_log_id,
        returnId: missingVoidReturnLine.return_id
      }
    }
  }

  return missingReturns
}

function _lines (reportingFrequency, startDate, endDate) {
  if (reportingFrequency === 'day') {
    return daysFromPeriod(startDate, endDate)
  }

  if (reportingFrequency === 'week') {
    return weeksFromPeriod(startDate, endDate)
  }

  return monthsFromPeriod(startDate, endDate)
}

module.exports = {
  go
}
