'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const LicenceVersionPurposeConditions = require('./lib/conditions.js')
const LicenceVersionPurposePoints = require('./lib/points.js')
const LicenceVersionPurposes = require('./lib/purposes.js')
const LicenceVersions = require('./lib/versions.js')

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    await LicenceVersions.go()
    await LicenceVersionPurposes.go()
    await LicenceVersionPurposePoints.go()
    await LicenceVersionPurposeConditions.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-versions-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-versions-import: errored', error)
  }
}

module.exports = {
  go
}
