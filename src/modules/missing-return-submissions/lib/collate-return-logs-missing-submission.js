'use strict'

function go (returnLogsMissingSubmission) {
  const returnRequirements = _processReturnLogs(returnLogsMissingSubmission)

  return Object.values(returnRequirements)
}

function _processReturnLogs (returnLogsMissingSubmission) {
  const returnRequirements = {}

  for (const returnLogMissingSubmission of returnLogsMissingSubmission) {
    const { return_requirement_id: returnRequirementId } = returnLogMissingSubmission

    const returnLog = {
      id: returnLogMissingSubmission.id,
      endDate: new Date(returnLogMissingSubmission.end_date),
      returnId: returnLogMissingSubmission.return_id,
      returnsFrequency: returnLogMissingSubmission.returns_frequency,
      startDate: new Date(returnLogMissingSubmission.start_date)
    }

    if (returnRequirements[returnRequirementId]) {
      returnRequirements[returnRequirementId].returnLogs.push(returnLog)

      continue
    }

    returnRequirements[returnRequirementId] = {
      regionId: returnLogMissingSubmission.region_id,
      returnReference: returnLogMissingSubmission.return_reference,
      returnRequirementId,
      returnLogs: [returnLog]
    }
  }

  return returnRequirements
}

module.exports = {
  go
}
