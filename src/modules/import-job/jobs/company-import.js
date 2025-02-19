'use strict'

const CompanyImportProcess = require('../../company-import/process.js')

const LinkToModLogsJob = require('./link-to-mod-logs.js')

const JOB_NAME = 'import-job.company-import'

function createMessage (data) {
  return {
    name: JOB_NAME,
    data,
    options: {
      singletonKey: `${JOB_NAME}.${data.jobNumber}`
    }
  }
}

async function handler (job) {
  try {
    // Most 'jobs' are single operation things, for example, flag-deleted-documents or end-date-check. However, there
    // are typically 70K instances of this job queued up as part of the process! If we logged everyone it would just be
    // noise in the logs. But that leaves us with no way of confirming the job is running. So, instead we get
    // `queue-company-import.js` to include details on the total number of jobs plus a job number for each one added. We
    // then use this information to log when the first is picked up and the last.
    //
    // N.B. It's not entirely accurate. If you added logging for all back in you might see the start message appear
    // after a few jobs and likewise the finished message a few before the end. But it's good enough to give an
    // indication that the 'jobs' did start and finish.
    if (job.data.jobNumber === 1) {
      global.GlobalNotifier.omg(`${JOB_NAME}: started`)
    }

    await CompanyImportProcess.go(job.data.party, false)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
  }
}

async function onComplete (messageQueue, job) {
  try {
    const { data } = job.data.request

    if (data.jobNumber === data.numberOfJobs) {
      // await messageQueue.publish(LinkToModLogsJob.createMessage())

      global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { numberOfJobs: job.data.request.data.numberOfJobs })
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
