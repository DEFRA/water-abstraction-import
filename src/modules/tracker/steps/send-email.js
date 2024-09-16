'use strict'

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const NotifyConnector = require('../../../lib/connectors/water/notify.js')

const config = require('../../../../config.js')

async function go (message = null) {
  try {
    global.GlobalNotifier.omg('tracker.send-email started')

    const startTime = currentTimeInNanoseconds()

    const content = _content(message)

    _send(content)

    calculateAndLogTimeTaken(startTime, 'tracker.send-email complete')
  } catch (error) {
    global.GlobalNotifier.omfg('tracker.send-email errored', error)
    throw error
  }
}

function _content (message) {
  const environment = `Sent from ${config.environment}\n\n`

  if (!message) {
    return `${environment}Someone triggered a test of the tracker email. You can ignore this message (it worked!)`
  }

  return `${environment}${message}`
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
