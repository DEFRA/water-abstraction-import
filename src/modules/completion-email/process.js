'use strict'

const { NotifyClient } = require('notifications-node-client')

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, formatLongDateTime } = require('../../lib/general.js')

const config = require('../../../config.js')

async function go (log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const jobs = await _jobs()

    const emailOptions = _emailOptions(jobs)

    await _sendEmail(emailOptions)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'completion-email: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('completion-email: errored', error)
  }
}

function _detail (jobs) {
  const details = jobs.map((job) => {
    const { createdOn, name, state, timeTaken } = job

    const startTime = createdOn.toLocaleTimeString('en-GB')
    const stepName = name.replace('import-job.', '')
    const stepDuration = timeTaken ? ` (${timeTaken.toPostgres()})` : null

    // NOTE: timeTaken is returned as a PostgresInterval custom type thanks to the pg package and as such has a method
    // we can call on to nicely format the interval value into something we can read
    return `* ${startTime} - ${stepName} - ${state}${stepDuration}`
  })

  return details.join('\n')
}

function _emailOptions (jobs) {
  const jobSummary = _jobSummary(jobs)
  const detail = _detail(jobs)
  const timeSummary = _timeSummary(jobs)

  return {
    personalisation: {
      detail,
      jobSummary,
      timeSummary
    }
  }
}

async function _jobs () {
  const results = await db.query(`
    SELECT
      j."name" AS job_name,
      j.state,
      j.createdon,
      j.completedon,
      age(j.completedon, j.createdon) AS time_taken
    FROM
      water_import.job j
    WHERE
      j."name" LIKE 'import-job.%'
    ORDER BY
      j.createdon ASC;
  `)

  return results.map((row) => {
    return {
      completedOn: row.completedon,
      createdOn: row.createdon,
      name: row.job_name,
      state: row.state,
      timeTaken: row.time_taken
    }
  })
}

function _jobSummary (jobs) {
  const failedJobs = jobs.filter((job) => {
    return job.state === 'failed'
  })

  if (failedJobs.length === 0) {
    return `The ${config.environment} environment had no steps fail during the overnight import job.`
  }

  return `The ${config.environment} environment had ${failedJobs.length} step(s) fail during the overnight import job.`
}

async function _sendEmail (options) {
  const client = new NotifyClient(config.notify.apiKey)

  await client.sendEmail(config.notify.templateId, config.notify.mailbox, options)
}

function _timeSummary (jobs) {
  const startTime = formatLongDateTime(jobs[0].createdOn)
  const endTime = formatLongDateTime(jobs[jobs.length - 1].createdOn)

  return `Started ${startTime} - finished ${endTime}`
}

module.exports = {
  go
}
