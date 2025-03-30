'use strict'

const axios = require ('axios')
// const { HttpsProxyAgent } = require('hpagent')
const proxyAgent = require('proxy-agent')
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

/**
 * Returns an instance of {@link https://github.com/alphagov/notifications-node-client | notifications-node-client}
 * configured to work in environments with and without proxy servers.
 *
 * Running locally just instantiating the NotifyClient was all we had to do. But when deployed to our AWS environments
 * which use the {@link https://www.squid-cache.org/ | Squid proxy server} it failed.
 *
 * Initially, we followed the
 * {@link https://docs.notifications.service.gov.uk/node.html#connect-through-a-proxy-optional | Notify documentation}
 * but all we saw was the following returned by **Squid**.
 *
 * ```text
 * This proxy and the remote host failed to negotiate a mutually acceptable security settings for handling your request.
 * It is possible that the remote host does not support secure connections, or the proxy is not satisfied with the host
 * security credentials.
 * ```
 *
 * It appears this is a {@link https://github.com/axios/axios/issues/6320 | known issue with Axios} and how it sends
 * data via the proxy. Most workarounds suggest that you in fact need to tell Axios to disable its proxy, and specify
 * its httpsAgent instead.
 *
 *
 *
 * @private
 */
function _notifyClient () {
  const notifyClient = new NotifyClient(config.notify.apiKey)
  const proxy = config.proxy

  if (proxy) {
    // const agent = new HttpsProxyAgent({ proxy: proxy })
    const agent = proxyAgent(proxy)
    const axiosInstance = axios.create({
      proxy: false,
      httpsAgent: agent
    })

    notifyClient.setClient(axiosInstance)
  }

  return notifyClient
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
  const client = _notifyClient()

  await client.sendEmail(config.notify.templateId, config.notify.mailbox, options)
}

module.exports = {
  go
}
