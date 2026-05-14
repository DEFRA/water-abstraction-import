'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const processHelper = require('@envage/water-abstraction-helpers').process

const s3 = require('../../../lib/services/s3.js')

const ZERO_RETURN_LINES_ZIP_FILE = 'zero-return-lines.zip'

async function checkFileExists () {
  try {
    await s3.getHead(ZERO_RETURN_LINES_ZIP_FILE)

    return true
  } catch (error) {
    if (['NotFound', 'NoSuchKey'].includes(error.name)) {
      return false // File does not exist
    }

    throw error // Handle other errors
  }
}

function cleanUpFiles (downloadLocalPath, extractLocalPath) {
  // Delete the files we created. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(downloadLocalPath, { force: true })
  fs.rmSync(extractLocalPath, { force: true, recursive: true })
}

async function downloadFile () {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, ZERO_RETURN_LINES_ZIP_FILE)

  // Delete any existing copy of the file. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(localPath, { force: true })

  await s3.download(ZERO_RETURN_LINES_ZIP_FILE, localPath)

  return localPath
}

async function extractFile (downloadLocalPath) {
  const temporaryFilePath = os.tmpdir()
  const localPath = path.join(temporaryFilePath, 'zero-return-lines')

  // Delete any existing files. Force true means if it doesn't exist don't error (saves us checking first)
  fs.rmSync(localPath, { force: true, recursive: true })

  const command = `7z x ${downloadLocalPath} -o${localPath}`

  await processHelper.execCommand(command)

  return localPath
}

function files (extractLocalPath) {
  return fs.readdirSync(extractLocalPath).filter((file) => {
    return file.endsWith('.csv')
  }).sort()
}

async function uploadFile (filename, data) {
  await s3.upload(filename, Buffer.from(data))
}

module.exports = {
  checkFileExists,
  cleanUpFiles,
  downloadFile,
  extractFile,
  files,
  uploadFile
}
