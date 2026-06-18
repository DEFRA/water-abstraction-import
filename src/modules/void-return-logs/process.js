'use strict'

const VoidWhereEndAfterLicenceEnds = require('./lib/void-where-end-after-licence-ends.js')
const VoidWhereReturnRequirementDeleted = require('./lib/void-where-return-requirement-deleted.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    await VoidWhereEndAfterLicenceEnds.go()
    await VoidWhereReturnRequirementDeleted.go()

    if (log) {
      calculateAndLogTimeTaken(startTime, 'void-return-logs: complete', { messages })
    }
  } catch (error) {
    global.GlobalNotifier.omfg('void-return-logs: errored', {}, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
