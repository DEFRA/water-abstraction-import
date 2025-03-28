'use strict'

const { NotifyClient } = require('notifications-node-client')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken, formatLongDateTime } = require('../../lib/general.js')

const config = require('../../../config.js')

async function go (steps) {
  try {
    const startTime = currentTimeInNanoseconds()

    const emailOptions = _emailOptions(steps)

    await _sendEmail(emailOptions)

    calculateAndLogTimeTaken(startTime, 'completion-email: complete')
  } catch (error) {
    global.GlobalNotifier.omfg('completion-email: errored', error)
  }
}

function _detail (steps) {
  const details = []

  for (const step of steps) {
    const { duration, logTime, name, messages } = step

    const startTime = logTime.toLocaleTimeString('en-GB')
    const durationMessage = _durationMessage(duration)

    details.push(`* ${startTime} - ${name} - ${durationMessage}`)

    for (const message of messages) {
      details.push(`  * ${message}`)
    }
  }

  return details.join('\n')
}

function _durationMessage (secondsAsBigInt) {
  const seconds = Number(secondsAsBigInt)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const hoursPart = hours >= 1 ? `${hours} hours ` : ''
  const minutesPart = minutes >= 1 ? `${minutes} minutes ` : ''
  const secondsPart = remainingSeconds >= 1 ? `${remainingSeconds} seconds` : '(milliseconds)'

  return `${hoursPart}${minutesPart}${secondsPart}`
}

function _emailOptions (steps) {
  return {
    personalisation: {
      detail: _detail(steps),
      summary: _summary(steps)
    }
  }
}

function _summary (steps) {
  const summary = []

  const startTime = formatLongDateTime(steps[0].logTime)
  const endTime = formatLongDateTime(steps[steps.length - 1].logTime)

  summary.push(`The overnight import job has been run in the ${config.environment} environment.`)
  summary.push(`Started ${startTime} - finished ${endTime}.`)

  return summary.join('\n\n')
}

async function _sendEmail (options) {
  const client = new NotifyClient(config.notify.apiKey)

  await client.sendEmail(config.notify.templateId, config.notify.mailbox, options)
}

module.exports = {
  go
}
