'use strict'

const ConvertToJson = require('./lib/convert-to-json.js')
const ProcessSubmission = require('./lib/process-submission.js')
const { checkFileExists, cleanUpFiles, downloadFile, extractFile, files, uploadFile } = require('./lib/file-manager.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

/**
 * This is a temporary script
 */
async function go(log = false) {
  const messages = []
  const processResults = []
  const timestamp = timestampForPostgres()

  let fileExists

  try {
    const startTime = currentTimeInNanoseconds()

    fileExists = await checkFileExists()

    if (fileExists) {
      const downloadLocalPath = await downloadFile()
      const extractLocalPath = await extractFile(downloadLocalPath)
      const submissionFiles = files(extractLocalPath)

      for (const submissionFile of submissionFiles) {
        const results = await _processSubmissionFile(extractLocalPath, submissionFile, timestamp)

        processResults.push(...results)
      }

      await _logResults(extractLocalPath, processResults, timestamp)

      cleanUpFiles(downloadLocalPath, extractLocalPath)
    }

    _setMessages(processResults, messages)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'zero-return-lines: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('zero-return-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

async function _logResults (extractLocalPath, logs, timestamp) {
  const logData = logs.map((log) => {
    return `${log.filename},${log.returnId},${log.process},${log.error || ''}`
  }).join('\n')

  await uploadFile(`zero-return-lines-log-${Date.parse(timestamp)}.csv`, logData)
}

async function _processSubmissionFile (extractLocalPath, submissionFile, timestamp) {
  const logs = []
  const submissions = ConvertToJson.go(extractLocalPath, submissionFile)

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
