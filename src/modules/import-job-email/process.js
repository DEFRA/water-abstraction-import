'use strict'

const { NotifyClient } = require('notifications-node-client')

const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const JobsConnector = require('../../lib/connectors/water-import/jobs.js')

const config = require('../../../config.js')

async function go(log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const failedJobs = await JobsConnector.getFailedJobs()

    const emailOptions = _emailOptions(failedJobs)

    await _sendEmail(emailOptions)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'import-job-email: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('import-job-email: errored', error)
  }
}

function _emailOptions (failedJobs) {
  const options = {
    personalisation: {
      content: `The ${config.environment} environment reported no failures with the overnight import job.`
    }
  }

  if (failedJobs.length === 0) {
    return options
  }

  const reportRows = []
  for (const failedJob of failedJobs) {
    const { dateCompleted, dateCreated, jobName, total } = failedJob
    const reportRow = `Job Name: ${jobName} \nTotal Errors: ${total} \nDate created: ${dateCreated} \nDate completed: ${dateCompleted}`

    reportRows.push(reportRow)
  }

  const subTitle = `The ${config.environment} environment reported ${failedJobs.length} failures with the overnight import job.`

  options.personalisation.content = `${subTitle}\n\n${reportRows.join('\n\n')}`

  return options
}

async function _sendEmail (options) {
  const client = new NotifyClient(config.notify.apiKey)

  await client.sendEmail(config.notify.templateId, config.notify.mailbox, options)
}

module.exports = {
  go
}
