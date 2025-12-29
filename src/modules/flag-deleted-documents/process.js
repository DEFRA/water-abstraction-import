'use strict'

const CrmDocuments = require('./lib/crm-documents.js')
const CrmV2Documents = require('./lib/crm-v2-documents.js')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await CrmDocuments.go()
    await CrmV2Documents.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'flag-deleted-documents: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('flag-deleted-documents: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
