'use strict'

// We use promisify to wrap exec in a promise. This allows us to await it without resorting to using callbacks.
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const pkg = require('../../../package.json')

async function getInfo (_request, h) {
  const result = {
    version: pkg.version,
    commit: await _commitHash()
  }

  return h.response(result).code(200)
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
  getInfo
}
