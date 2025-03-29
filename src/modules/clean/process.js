'use strict'

const DeletedLicences = require('./lib/deleted-licences.js')
const DeletedLicenceData = require('./lib/deleted-licence-data.js')
const DeletedReturnData = require('./lib/deleted-return-data.js')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (cleanLicences = false, skipReturnData = false, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    if (cleanLicences) {
      await DeletedLicences.go()
      await DeletedLicenceData.go()
    } else {
      global.GlobalNotifier.omg('clean: skipped licences')
      messages.push('Skipped cleaning licences as not enabled')
    }

    if (skipReturnData) {
      global.GlobalNotifier.omg('clean: skipped return version data')
      messages.push('Skipped because importing returns is disabled')

      return messages
    }

    await DeletedReturnData.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clean: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clean: errored', error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
