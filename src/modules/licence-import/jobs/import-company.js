'use strict'

const QueueLicencesSystemJob = require('./queue-licences-system')
const extract = require('../extract')
const importCompanies = require('../connectors/import-companies')
const load = require('../load')
const transform = require('../transform')

const JOB_NAME = 'licence-import.import-company'

const options = {
  teamSize: 75,
  teamConcurrency: 1
}

/**
 * Data needed by the import company handler to process the job
 *
 * This is a convention with PGBoss. A number of the jobs/handlers implement a `createMessage()` function which returns
 * a data object that will be used to queue the job. When it then gets processed the data object is passed to the
 * handler.
 *
 * It may also contain non-default config to be used by PGBoss when adding the job, for example, the use of
 * `singletonKey` in this job.
 *
 * @param {Object} data - information needed for the handler to complete the job
 * @param {Object.string} data.regionCode - region Code from NALD_PARTIES
 * @param {Object.string} data.partyId - id from NALD_PARTIES
 * @param {Object.number} data.jobNumber - index position of this job from all jobs when added to the queue
 * @param {Object.number} data.numberOfJobs - total number of import-company jobs queued in this session
 *
 * @return {Object} the message object used by the handler to process the job
 */
function createMessage (data) {
  return {
    name: JOB_NAME,
    data,
    options: {
      singletonKey: `${JOB_NAME}.${data.regionCode}.${data.partyId}`,
      expireIn: '1 hours'
    }
  }
}

async function handler (job) {
  try {
    // Most 'jobs' are single operation things in the licence import process, for example, delete any removed documents
    // or import the purposes types. However, there are typically 69K instances of this job queued up as part of the
    // process! Previously, we logged every instance hence this was a primary offender in adding noise to the logs. We
    // removed that logging but that leaves us with no way of confirming the job is running. So, instead we get
    // src/modules/licence-import/jobs/queue-companies.js to include details on how many jobs are queued and when each
    // one was added to the queue. We then use this information to log when the first is picked up and the last.
    //
    // N.B. It's not entirely accurate. If you added logging for all back in you might see the start message appear
    // after a few jobs and likewise the finished message a few before the end. But it's good enough to give an
    // indication that the 'jobs' did start and finish.
    if (job.data.jobNumber === 1) {
      global.GlobalNotifier.omg(`${JOB_NAME}: started`, { numberOfJobs: job.data.numberOfJobs })
    }

    const { regionCode, partyId } = job.data

    // Extract data
    const data = await extract.getCompanyData(regionCode, partyId)

    // Transform to new structure
    const mapped = transform.company.transformCompany(data)

    // Load to CRM database
    await load.company.loadCompany(mapped)

    await importCompanies.setImportedStatus(regionCode, partyId)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (messageQueue) {
  const count = await importCompanies.getPendingCount()

  if (count === 0) {
    await messageQueue.deleteQueue('__state__completed__licence-import.import-company')
    await messageQueue.publish(QueueLicencesSystemJob.createMessage())

    global.GlobalNotifier.omg(`${JOB_NAME}: finished`)
  }
}

module.exports = {
  createMessage,
  handler,
  onComplete,
  name: JOB_NAME,
  options
}
