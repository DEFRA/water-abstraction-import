'use strict'

const DocumentsStep = require('./steps/documents.js')
const DocumentHeadersStep = require('./steps/document-headers.js')
const ReturnVersionsStep = require('./steps/return-versions.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  let processComplete = false

  try {
    global.GlobalNotifier.omg('clean started')

    const startTime = currentTimeInNanoseconds()

    await DocumentsStep.go()
    await DocumentHeadersStep.go()
    await ReturnVersionsStep.go()

    processComplete = true

    calculateAndLogTimeTaken(startTime, 'clean complete')
  } catch (error) {
    global.GlobalNotifier.oops('clean failed')
  }

  return processComplete
}

module.exports = {
  go
}
