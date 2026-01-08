'use strict'

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const Licences = require('./lib/licences.js')
const LicenceVersionHolders = require('./lib/holders.js')
const LicenceVersionPurposeConditions = require('./lib/conditions.js')
const LicenceVersionPurposePoints = require('./lib/points.js')
const LicenceVersionPurposes = require('./lib/purposes.js')
const LicenceVersions = require('./lib/versions.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await Licences.go()
    await LicenceVersions.go()
    await LicenceVersionHolders.go()
    await LicenceVersionPurposes.go()
    await LicenceVersionPurposePoints.go()
    await LicenceVersionPurposeConditions.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licences-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licences-import: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
