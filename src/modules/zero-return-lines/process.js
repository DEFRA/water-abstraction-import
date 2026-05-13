'use strict'

const fs = require('node:fs')

const ConvertToJson = require('./lib/convert-to-json.js')
const ProcessSubmissions = require('./lib/process-submissions.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

const LOCATION_OF_FILES = '/home/tmp/water-5481'

/**
 * This is a temporary script
 */
async function go(log = false) {
  const messages = []
  const timestamp = timestampForPostgres()

  try {
    const startTime = currentTimeInNanoseconds()

    const files = _returnFiles()

    const submissions = ConvertToJson.go(LOCATION_OF_FILES, files[0])

    await ProcessSubmissions.go(submissions, timestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'zero-return-lines: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('zero-return-lines: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

function _returnFiles() {
  return fs.readdirSync(LOCATION_OF_FILES).filter((file) => {
      return file.endsWith('.csv')
    }).sort()
}

module.exports = {
  go
}
