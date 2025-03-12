'use strict'

const processHelper = require('@envage/water-abstraction-helpers').process

const config = require('../../../../config')

async function extractArchive (source, destination, password) {
  let command = `7z x ${source} -o${destination}`

  if (password) {
    command += ` -p${password}`
  }

  await processHelper.execCommand(command)
}

async function extract () {
  const zipPassword = config.import.nald.zipPassword

  await extractArchive('./temp/nald_enc.zip', './temp/', zipPassword)
  await extractArchive('./temp/NALD.zip', './temp/')
}

module.exports = {
  extract
}
