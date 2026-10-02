'use strict'

const FetchInvalidSplitLogs = require('./fetch-invalid-split-logs.js')
const MergeReturnsData = require('./merge-returns-data.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')

async function go (requirementWithInvalidSplitLog, timestamp) {
  let message

  const { returnRequirementId, returnCycleId } = requirementWithInvalidSplitLog

  try {
    const invalidSplitLogs = await FetchInvalidSplitLogs.go(returnRequirementId, returnCycleId)
    console.log('🚀🚀🚀 ~ invalidSplitLogs:')
    console.dir(invalidSplitLogs, { depth: null, colors: true })

    const mergedInvalidSplitLogData = _mergeInvalidSplitLogData(invalidSplitLogs)

    console.log('🚀🚀🚀 ~ mergedInvalidSplitLogData:')
    console.dir(mergedInvalidSplitLogData, { depth: null, colors: true })

    await MergeReturnsData.go(mergedInvalidSplitLogData, timestamp)
  } catch (error) {
    console.log('🚀🚀🚀 ~ error:')
    console.dir(error, { depth: null, colors: true })
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
    const scoreResult = a.score - b.score

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

  for (const invalidSplitLog of invalidSplitLogs) {
    invalidSplitLog.submissionCount = Number(invalidSplitLog.submissionCount)

    _scoreInvalidSplitLog(invalidSplitLog)

    const { dueDate, endDate, receivedDate, sentDate, startDate } = invalidSplitLog

    startDates.push(new Date(startDate))
    endDates.push(new Date(endDate))
    dueDates.push(new Date(dueDate))
    sentDates.push(new Date(sentDate))
    receivedDates.push(new Date(receivedDate))
  }

  const keeper = _determineKeeper(invalidSplitLogs)

  keeper.toKeep.startDate = _earliestDate(startDates)
  keeper.toKeep.endDate = _latestDate(endDates)
  keeper.toKeep.dueDate = _latestDate(dueDates)
  keeper.toKeep.sentDate = _latestDate(sentDates)
  keeper.toKeep.receivedDate = _latestDate(receivedDates)

  _applyReturnId(keeper.toKeep)

  return keeper
}

function _scoreInvalidSplitLog(splitLog) {
  const { status, submissionCount, userSubmission } = splitLog

  splitLog.score = submissionCount

  if (userSubmission) {
    splitLog.score += 100
  }

  if (status === 'complete') {
    splitLog.score += 10
  }
}

module.exports = {
  go
}
