'use strict'

const ProcessSteps = require('./process-steps.js')

async function licenceDetails (_request, h) {
  ProcessSteps.go()

  return h.response().code(204)
}

module.exports = {
  licenceDetails
}