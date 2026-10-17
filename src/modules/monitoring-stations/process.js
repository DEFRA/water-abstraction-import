'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const AlreadyRun = require('../../lib/services/already-run.js')
const CreateMonitoringStations = require('./lib/create-monitoring-stations.js')
const RecordRun = require('../../lib/services/record-run.js')
const s3 = require('../../lib/services/s3.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

const MONITORING_STATIONS_FILE = 'water-5858_new-monitoring-stations.json'

async function go (log = false) {
  const messages = []

  let fileExists

  try {
    const startTime = currentTimeInNanoseconds()

    const hasAlreadyRun = await AlreadyRun.go('monitoring-stations')

    if (hasAlreadyRun) {
      global.GlobalNotifier.omg('monitoring-stations: skipped')
      messages.push('Skipped because they have already been loaded')

      return messages
    }

    fileExists = await _fileExists()

    if (!fileExists) {
      global.GlobalNotifier.omg('monitoring-stations: skipped')
      messages.push('Skipped because the file was not found in the bucket')

      return messages
    }

    const downloadLocalPath = await _downloadFile()

    const monitoringStations = _loadFile(downloadLocalPath)

    const timestamp = timestampForPostgres()

    const errorMessages = await CreateMonitoringStations.go(monitoringStations, timestamp)

    messages.push(...errorMessages)

    await RecordRun.go('monitoring-stations')

    if (log) {
      calculateAndLogTimeTaken(startTime, 'monitoring-stations: complete', { fileExists })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('monitoring-stations: errored', { fileExists }, error)

    messages.push(error.message)
  }

  return messages
}

async function _downloadFile () {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, MONITORING_STATIONS_FILE)

  // Delete any existing copy of the file. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(localPath, { force: true })

  await s3.download(MONITORING_STATIONS_FILE, localPath)

  return localPath
}

async function _fileExists () {
  try {
    await s3.getHead(MONITORING_STATIONS_FILE)

    return true
  } catch (error) {
    if (['NotFound', 'NoSuchKey'].includes(error.name)) {
      return false // File does not exist
    }

    throw error // Handle other errors
  }
}

function _loadFile (localPath) {
  const monitoringStations = require(localPath)
  return monitoringStations
}

module.exports = {
  go
}
