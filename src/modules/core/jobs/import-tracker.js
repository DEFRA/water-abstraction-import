'use strict'

const jobsConnector = require('../../../lib/connectors/water-import/jobs')
const notifyService = require('../../../lib/services/notify')

const config = require('../../../../config')

const JOB_NAME = 'import.tracker'

const createMessage = () => ({
  name: JOB_NAME,
  options: {
    singletonKey: JOB_NAME
  }
})

const handler = async () => {
  try {
    global.GlobalNotifier.omg('import.tracker: started')

    const jobs = await jobsConnector.getFailedJobs()
    // if there are any jobs that have failed in the last 12 hours
    if (jobs.length > 0) {
      const subTitle = jobs.length > 1 ? `There are ${jobs.length} failed import jobs in the` : 'There is 1 failed import job in the'
      const content = `${subTitle} ${config.environment} environment.\n\n` +
      jobs.reduce((acc, row) => {
        acc = acc + `Job Name: ${row.jobName} \nTotal Errors: ${row.total} \nDate created: ${row.dateCreated} \nDate completed: ${row.dateCompleted}\n\n`
        return acc
      }, '')
      if (config.isProduction) {
        notifyService.sendEmail(process.env.WATER_SERVICE_MAILBOX, 'service_status_alert', { content })
      }
    }

    global.GlobalNotifier.omg('import.tracker: finished')
  } catch (error) {
    global.GlobalNotifier.omfg('import.tracker: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
