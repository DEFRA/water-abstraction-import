'use strict'

const CleanNoRequirements = require('./lib/clean-no-requirement.js')
const CleanReceivedOnly = require('./lib/clean-received-only.js')
const CleanSummer = require('./lib/clean-summer.js')
const CleanWinter = require('./lib/clean-winter.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await CleanReceivedOnly.go()
    await CleanSummer.go()
    await CleanWinter.go()
    await CleanNoRequirements.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'invalid-returns-cleanup: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('invalid-returns-cleanup: errored', null, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
