'use strict'

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const NotifyConnector = require('../../../lib/connectors/water/notify.js')

const config = require('../../../../config.js')

async function go (message) {
  try {
    global.GlobalNotifier.omg('tracker.send-email started')

    const startTime = currentTimeInNanoseconds()

    const environment = `Sent from ${config.environment}\n\n`

    _send(`${environment}${message}`)

    calculateAndLogTimeTaken(startTime, 'tracker.send-email complete')
  } catch (error) {
    global.GlobalNotifier.omfg('tracker.send-email errored', error)
    throw error
  }
}

function _send (content) {
  NotifyConnector.postSendNotify(
    'email',
    {
      templateId: config.notify.templateId,
      personalisation: { content },
      recipient: config.notify.mailbox
    }
  ).catch((_error) => {
    global.GlobalNotifier.oops('tracker.send-email noting send errors even when email sent!')
  })
}

module.exports = {
  go
}
