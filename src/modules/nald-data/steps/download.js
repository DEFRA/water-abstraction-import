'use strict'

const ProcessHelper = require('@envage/water-abstraction-helpers').process

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const S3 = require('../../../lib/services/s3')

async function go () {
  try {
    global.GlobalNotifier.omg('nald-data.download started')

    const startTime = currentTimeInNanoseconds()

    await ProcessHelper.execCommand("rm -rf './temp/'")
    await ProcessHelper.execCommand("mkdir -p './temp/'")
    await ProcessHelper.execCommand("mkdir -p './temp/NALD'")

    await S3.download('wal_nald_data_release/nald_enc.zip', './temp/nald_enc.zip')

    calculateAndLogTimeTaken(startTime, 'nald-data.download complete')
  } catch (error) {
    global.GlobalNotifier.omfg('nald-data.download errored', error)
    throw error
  }
}

module.exports = {
  go
}
