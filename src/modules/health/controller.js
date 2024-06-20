'use strict'

// We use promisify to wrap exec in a promise. This allows us to await it without resorting to using callbacks.
const util = require('util')
const exec = util.promisify(require('child_process').exec)

// const pkg = require('../../../package.json')

async function getAirbrake (request, _h) {
  // First section tests connecting to Airbrake through a manual notification
  request.server.app.airbrake.notify({
    message: 'Airbrake manual health check',
    error: new Error('Airbrake manual health check error'),
    session: {
      req: {
        id: request.info.id
      }
    }
  })

  // Second section throws an error and checks that we automatically capture it and then connect to Airbrake
  throw new Error('Airbrake automatic health check error')
}

async function getInfo (_request, h) {
  const result = {
    version: await _tagReference(),
    commit: await _commitHash()
  }

  return h.response(result).code(200)
}

async function _tagReference () {
  try {
    const { stdout, stderr } = await exec('git describe --always --tags')

    return stderr ? `ERROR: ${stderr}` : stdout.replace('\n', '')
  } catch (error) {
    return `ERROR: ${error.message}`
  }
}

async function _commitHash () {
  try {
    const { stdout, stderr } = await exec('git rev-parse HEAD')

    return stderr ? `ERROR: ${stderr}` : stdout.replace('\n', '')
  } catch (error) {
    return `ERROR: ${error.message}`
  }
}

module.exports = {
  getAirbrake,
  getInfo
}
