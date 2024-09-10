'use strict'

const ProcessHelper = require('@envage/water-abstraction-helpers').process

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')

const config = require('../../../../config')

async function go () {
  try {
    global.GlobalNotifier.omg('nald-data.extract started')

    const startTime = currentTimeInNanoseconds()

    await _extractArchive('./temp/nald_enc.zip', './temp/', config.import.nald.zipPassword)
    await _extractArchive('./temp/NALD.zip', './temp/')

    calculateAndLogTimeTaken(startTime, 'nald-data.extract complete')
  } catch (error) {
    global.GlobalNotifier.omfg('nald-data.extract errored', error)
    throw error
  }
}

async function _extractArchive (source, destination, password) {
  let command = `7z x ${source} -o${destination}`

  if (password) {
    command += ` -p${password}`
  }
  await ProcessHelper.execCommand(command)
}

module.exports = {
  go
}
