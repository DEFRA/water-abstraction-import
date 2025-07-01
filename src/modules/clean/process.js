'use strict'

const DeletedLicences = require('./lib/deleted-licences.js')
const DeletedLicenceData = require('./lib/deleted-licence-data.js')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await DeletedLicences.go()
    await DeletedLicenceData.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clean: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clean: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
