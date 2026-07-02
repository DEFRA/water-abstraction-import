'use strict'

const CleanModLogs = require('./lib/clean-mod-logs.js')
const ImportModLogs = require('./lib/import-mod-logs.js')
const LinkModLogs = require('./lib/link-mod-logs.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await ImportModLogs.go()
    await LinkModLogs.go()
    await CleanModLogs.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'mod-logs-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('mod-logs-import: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
