'use strict'

const { persistReturns } = require('../lib/persist-returns.js')
const returnsConnector = require('../../../lib/connectors/returns.js')
const { buildReturnsPacket } = require('../lib/transform-returns.js')

const JOB_NAME = 'return-logs.import'

function createMessage (data) {
  return {
    name: JOB_NAME,
    data,
    options: {
      singletonKey: `${JOB_NAME}.${data.licence.id}.${data.licence.regionCode}`
    }
  }
}

async function handler (job) {
  try {
    // Most 'jobs' are single operation things, for example, delete any removed documents or import purposes types.
    // However, there are typically 73K instances of this job queued up as part of the process! If we logged everyone it
    // would just be noise in the logs. But that leaves us with no way of confirming the job is running. So, instead we
    // get `queue.js` to include details on the total number of jobs plus a job number for each one added. We then use
    // this information to log when the first is picked up and the last.
    //
    // N.B. It's not entirely accurate. If you added logging for all back in you might see the start message appear
    // after a few jobs and likewise the finished message a few before the end. But it's good enough to give an
    // indication that the 'jobs' did start and finish.
    if (job.data.jobNumber === 1) {
      global.GlobalNotifier.omg(`${JOB_NAME}: started`, { numberOfJobs: job.data.numberOfJobs })
    }

    await _loadReturns(job.data.licence.licenceRef, job.data.replicateReturnLogs)
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function onComplete (job) {
  try {
    const { data } = job.data.request

    if (data.jobNumber === data.numberOfJobs) {
      global.GlobalNotifier.omg(`${JOB_NAME}: finished`, { numberOfJobs: job.data.request.data.numberOfJobs })
    }
  } catch (error) {
    global.GlobalNotifier.omfg(`${JOB_NAME}: errored`, error)
    throw error
  }
}

async function _loadReturns (licenceNumber, replicateReturnLogs) {
  const { returns } = await buildReturnsPacket(licenceNumber)
  await persistReturns(returns, replicateReturnLogs)

  // Clean up invalid cycles
  const returnIds = returns.map(row => row.return_id)
  await returnsConnector.voidReturns(licenceNumber, returnIds)
}

module.exports = {
  JOB_NAME,
  createMessage,
  handler,
  onComplete
}
