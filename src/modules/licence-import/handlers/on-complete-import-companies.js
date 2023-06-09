'use strict'

const jobs = require('../jobs')

module.exports = async (messageQueue, job) => {
  const { value: parties } = job.data.response

  for (const party of parties) {
    await messageQueue.publish(jobs.importCompany(party.regionCode, party.partyId))
  }

  global.GlobalNotifier.omg('import.companies: finished')
}
