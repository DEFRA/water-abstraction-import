'use strict'

const ProcessSteps = require('./process-steps.js')

async function returnVersions (request, h) {
  ProcessSteps.go()

  return h.response().code(204)
}

module.exports = {
  returnVersions
}
