'use strict'

const fs = require('node:fs')

const ConvertToJson = require('./lib/convert-to-json.js')
const ProcessSubmission = require('./lib/process-submission.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

const LOCATION_OF_FILES = '/home/tmp/water-5481'

/**
 * This is a temporary script
 */
async function go(log = false) {
  const messages = []
  const processResults = []
  const timestamp = timestampForPostgres()

  try {
    const startTime = currentTimeInNanoseconds()

    const files = _returnFiles()

    for (const file of files) {
      const results = await _processFile(file, timestamp, messages)

      processResults.push(...results)
    }

    _setMessages(processResults, messages)

    _logResults(processResults, timestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'zero-return-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('zero-return-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

function _logResults (logs, timestamp) {
  const logData = logs.map((log) => {
    return `${log.filename},${log.returnId},${log.process},${log.error || ''}`
  }).join('\n')

  fs.writeFileSync(`${LOCATION_OF_FILES}/zero-return-lines-${timestamp}.csv`, logData)
}

async function _processFile (file, timestamp) {
  const logs = []
  const submissions = ConvertToJson.go(LOCATION_OF_FILES, file)

  for (const submission of submissions) {
    const { filename, process, returnId } = submission

    const log = { filename, process, returnId }

    if (submission.process) {
      try {
        await ProcessSubmission.go(submission, timestamp)
      } catch (error) {
        log.error = error.message
      }
    }

    logs.push(log)
  }

  return logs
}

function _returnFiles() {
  return fs.readdirSync(LOCATION_OF_FILES).filter((file) => {
      return file.endsWith('.csv')
    }).sort()
}

function _setMessages(processResults, messages) {
  const total = processResults.length

  const processedCount = processResults.filter((logEntry) => {
    return logEntry.process
  }).length

  const failedCount = processResults.filter((logEntry) => {
    return logEntry.error
  }).length

  messages.push(`${total} return submissions checked. ${processedCount} processed. ${failedCount} failed.`)
}

module.exports = {
  go
}
