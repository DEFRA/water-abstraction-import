'use strict'

const DeletedLicences = require('./lib/deleted-licences.js')
const DeletedLicenceData = require('./lib/deleted-licence-data.js')
const DeletedReturnData = require('./lib/deleted-return-data.js')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go(cleanLicences = false, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    if (cleanLicences) {
      await DeletedLicences.go()
      await DeletedLicenceData.go()
    }
    await DeletedReturnData.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'clean: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('clean: errored', error)
  }
}

module.exports = {
  go
}
