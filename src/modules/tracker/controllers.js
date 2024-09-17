'use strict'

const ProcessSteps = require('./process-steps.js')

async function tracker (_request, h) {
  ProcessSteps.go('Someone triggered a test of the tracker email. You can ignore this message (it obviously worked!)')

  return h.response().code(204)
}

module.exports = {
  tracker
}
