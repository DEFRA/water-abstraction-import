'use strict'

const SendEmailStep = require('./steps/send-email.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go (message) {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('tracker started')

    const startTime = currentTimeInNanoseconds()

    await SendEmailStep.go(message)

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'tracker complete')
  } catch (error) {
    global.GlobalNotifier.oops('tracker failed')
  }

  return processComplete
}

module.exports = {
  go
}
