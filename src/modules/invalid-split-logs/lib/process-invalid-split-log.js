'use strict'

const FetchInvalidSplitLogs = require('./fetch-invalid-split-logs.js')
const MergeReturnsData = require('./merge-returns-data.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')

async function go (requirementWithInvalidSplitLog, timestamp) {
  let message

  const { returnRequirementId, returnCycleId } = requirementWithInvalidSplitLog

  try {
    const invalidSplitLogs = await FetchInvalidSplitLogs.go(returnRequirementId, returnCycleId)

    const mergedInvalidSplitLogData = _mergeInvalidSplitLogData(invalidSplitLogs)

    await MergeReturnsData.go(mergedInvalidSplitLogData, timestamp)
  } catch (error) {
    console.error(`Error: ${error.message}`, requirementWithInvalidSplitLog, error)
    message = `Ret. req. ${returnRequirementId} / Ret. cycle ${returnCycleId} error: ${error.message}`
  }

  return message
}

function _applyReturnId (mergedSplitLog) {
  const regionCode = mergedSplitLog.returnId.charAt(3)
  const licenceReference = mergedSplitLog.licenceRef
  const returnReference = mergedSplitLog.returnReference
  const startDateAsString = formatDateObjectToISO(mergedSplitLog.startDate)
  const endDateAsString = formatDateObjectToISO(mergedSplitLog.endDate)

  mergedSplitLog.returnId = `v1:${regionCode}:${licenceReference}:${returnReference}:${startDateAsString}:${endDateAsString}`
}

function _determineKeeper (invalidSplitLogs) {
  const sortedInvalidSplitLogs = invalidSplitLogs.sort((a, b) => {
    const scoreResult = b.score - a.score

    if (scoreResult !== 0) {
      return scoreResult
    }

    return Math.sign(new Date(b.startDate) - new Date(a.startDate))
  })

  return {
    toKeep: sortedInvalidSplitLogs[0],
    toDrop: sortedInvalidSplitLogs.slice(1)
  }
}

function _earliestDate(dates) {
  const earliestDate = Math.min(...dates)

  if (earliestDate) {
    return new Date(earliestDate)
  }

  return null
}

function _latestDate(dates) {
  const latestDate = Math.max(...dates)

  if (latestDate) {
    return new Date(latestDate)
  }

  return null
}

function _mergeInvalidSplitLogData (invalidSplitLogs) {
  const dueDates = []
  const endDates = []
  const receivedDates = []
  const sentDates = []
  const startDates = []

  let notCurrent = false

  for (const invalidSplitLog of invalidSplitLogs) {
    invalidSplitLog.submissionCount = Number(invalidSplitLog.submissionCount)

    _scoreInvalidSplitLog(invalidSplitLog)

    const { dueDate, endDate, receivedDate, sentDate, startDate, isCurrent } = invalidSplitLog

    startDates.push(new Date(startDate))
    endDates.push(new Date(endDate))
    dueDates.push(new Date(dueDate))
    sentDates.push(new Date(sentDate))
    receivedDates.push(new Date(receivedDate))

    if (!isCurrent) {
      notCurrent = true
    }
  }

  const keeper = _determineKeeper(invalidSplitLogs)

  keeper.toKeep.startDate = _earliestDate(startDates)
  keeper.toKeep.endDate = _latestDate(endDates)
  keeper.toKeep.dueDate = _latestDate(dueDates)
  keeper.toKeep.sentDate = _latestDate(sentDates)
  keeper.toKeep.receivedDate = _latestDate(receivedDates)
  keeper.toKeep.isCurrent = !notCurrent

  // It wouldn't be possible to receive a return before it ends, so we nullify the received date if it is earlier than
  // the end date
  if (keeper.toKeep.receivedDate < keeper.toKeep.endDate) {
    keeper.toKeep.receivedDate = null
  }

  _applyReturnId(keeper.toKeep)

  return keeper
}

function _scoreInvalidSplitLog(splitLog) {
  const { nilSubmission, status, submissionCount, userSubmission } = splitLog

  splitLog.score = submissionCount

  // As user submission that is not a nil return scores the highest. This is the one we want to prioritize
  if (userSubmission && !nilSubmission) {
    splitLog.score += 10000
  }

  // As non-user submission that is not a nil return is next in priority. This handles where we have two 'complete'
  // split-logs, but one of them has been marked as a 'nil return'. We don't want to keep the nil return and loose
  // the submission data against the other one. Hence, we prioritize non-nil submissions.
  if (submissionCount && !nilSubmission) {
    splitLog.score += 1000
  }

  // If we're here, then we may be having to decide between a user submission and a non-user submission, both of which
  // are either non-nil or nil returns. In this case we prioritize the user submission over the non-user submission.
  if (userSubmission) {
    splitLog.score += 100
  }

  // Finally, we prioritize split logs that have a submission, over those that don't.
  if (status === 'completed') {
    splitLog.score += 10
  }
}

module.exports = {
  go
}
