'use strict'

function go (missingReturnLogs) {
  const missingReturns = _processReturnLogs(missingReturnLogs)

  return Object.values(missingReturns)
}

function _processReturnLogs (missingReturnLogs) {
  const missingReturns = {}

  for (const missingReturnLog of missingReturnLogs) {
    const { return_requirement_id: returnRequirementId } = missingReturnLog

    const returnLog = {
      dueDate: new Date(missingReturnLog.return_period_due_date),
      endDate: new Date(missingReturnLog.return_period_end_date),
      returnCycleId: missingReturnLog.return_cycle_id,
      returnId: missingReturnLog.return_id,
      startDate: new Date(missingReturnLog.return_period_start_date)
    }

    if (missingReturns[returnRequirementId]) {
      missingReturns[returnRequirementId].returnLogs.push(returnLog)

      continue
    }

    missingReturns[returnRequirementId] = {
      licence: {
        endDate: missingReturnLog.licence_end_date ? new Date(missingReturnLog.licence_end_date) : null,
        id: missingReturnLog.licence_id,
        licenceRef: missingReturnLog.licence_ref,
      },
      returnVersion: {
        endDate: missingReturnLog.return_version_end_date ? new Date(missingReturnLog.return_version_end_date) : null,
        id: missingReturnLog.return_version_id,
        startDate: new Date(missingReturnLog.return_version_start_date)
      },
      abstractionPeriod: {
        startDay: missingReturnLog.abstraction_period_start_day,
        startMonth: missingReturnLog.abstraction_period_start_month,
        endDay: missingReturnLog.abstraction_period_end_day,
        endMonth: missingReturnLog.abstraction_period_end_month
      },
      areaCode: missingReturnLog.area_code,
      multipleUpload: missingReturnLog.water_undertaker,
      reference: missingReturnLog.legacy_id,
      reportingFrequency: missingReturnLog.reporting_frequency,
      returnRequirementId: returnRequirementId,
      siteDescription: missingReturnLog.site_description,
      summer: missingReturnLog.summer,
      twoPartTariff: missingReturnLog.two_part_tariff,
      regionId: missingReturnLog.region_id,
      returnLogs: [returnLog]
    }
  }

  return missingReturns
}

module.exports = {
  go
}
