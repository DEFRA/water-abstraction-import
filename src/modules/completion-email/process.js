'use strict'

const moment = require('moment')
const { NotifyClient } = require('notifications-node-client')

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

const config = require('../../../config.js')

async function go (log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const failedJobs = await _failedJobsSummary()

    const emailOptions = _emailOptions(failedJobs)

    await _sendEmail(emailOptions)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'completion-email: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('completion-email: errored', error)
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

async function _failedJobsSummary () {
  const results = await db.query(`
    SELECT
      name,
      sum(count) AS count,
      max(max_completed_date) AS max_completed_date,
      max(max_created_date) AS max_created_date
    FROM
      (
        SELECT
            name,
            COUNT(*),
            max(completedon) AS max_completed_date,
            max(createdon) AS max_created_date
        FROM
            water_import.job j
        WHERE
            j.state = 'failed'
        GROUP BY
          j.name
      UNION ALL
        SELECT
            name,
            COUNT(*),
            max(completedon) AS max_completed_date,
            max(createdon) AS max_created_date
        FROM
            water_import.archive a
        WHERE
            a.state = 'failed'
        GROUP BY
          a.name
      ) cte
    GROUP BY
      name;
  `)

  return results.map((row) => {
    return {
      jobName: row.name,
      total: row.count,
      dateCreated: row.max_created_date ? moment(row.max_created_date).format('DD MMM YYYY HH:mm:ss') : '',
      dateCompleted: row.max_completed_date ? moment(row.max_completed_date).format('DD MMM YYYY HH:mm:ss') : ''
    }
  })
}

async function _sendEmail (options) {
  const client = new NotifyClient(config.notify.apiKey)

  await client.sendEmail(config.notify.templateId, config.notify.mailbox, options)
}

module.exports = {
  go
}
