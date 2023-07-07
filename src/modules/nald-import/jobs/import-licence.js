'use strict'

const licenceLoader = require('../load')

const JOB_NAME = 'nald-import.import-licence'

const options = {
  teamSize: 75,
  teamConcurrency: 1
}

/**
 * Data needed by the import licence handler to process the job
 *
 * This is a convention with PGBoss. A number of the jobs/handlers implement a `createMessage()` function which returns
 * a data object that will be used to queue the job. When it then gets processed the data object is passed to the
 * handler.
 *
 * It may also contain non-default config to be used by PGBoss when adding the job, for example, the use of
 * `singletonKey` in this job.
 *
 * @param {Object} data - information needed for the handler to complete the job
 * @param {Object.string} data.licenceNumber - reference of the licence to import
 * @param {Object.number} data.jobNumber - index position of all licence numbers when this job was added to the queue
 * @param {Object.number} data.numberOfJobs - total number of import-licence jobs queued in this session
 *
 * @returns {Object} the message object used by the handler to process the job
 */
function createMessage (data) {
  return {
    name: JOB_NAME,
    data,
    options: {
      // Using the licence number as the singleton ensures PGBoss only adds one import licence job for this licence to the
      // queue. If anything else tries to add a job with the same licence number PGBoss will ignore it
      singletonKey: data.licenceNumber
    }
  }
}

async function handler (job) {
  try {
    // Most 'jobs' are single operation things in the NALD import process, for example, deal with the NALD zip file or
    // delete any removed documents. However, there are typically 71K instances of this job queued up as part of the
    // process! Previously, we logged every instance hence this was a primary offender in adding noise to the logs. We
    // removed that logging but that leaves us with no way of confirming the job is running. So, instead we get
    // src/modules/nald-import/jobs/queue-licences.js to include details on how many jobs are queued and when each one
    // was added to the queue. We then use this information to log when the first is picked up and the last.
    //
    // N.B. It's not entirely accurate. If you added logging for all back in you might see the start message appear
    // after a few jobs and likewise the finished message a few before the end. But it's good enough to give an
    // indication that the 'jobs' did start and finish.
    if (job.data.jobNumber === 1) {
      global.GlobalNotifier.omg(`${JOB_NAME}: started`, { numberOfJobs: job.data.numberOfJobs })
    }

    // Import the licence
    await licenceLoader.load(job.data.licenceNumber)

    if (job.data.jobNumber === job.data.numberOfJobs) {
      global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { numberOfJobs: job.data.numberOfJobs })
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, job.data, error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  name: JOB_NAME,
  options
}
