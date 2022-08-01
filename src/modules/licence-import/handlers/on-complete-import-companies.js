const jobs = require('../jobs')

module.exports = async (messageQueue, job) => {
  const { value: parties } = job.data.response
  for (const row of parties) {
    await messageQueue.publish(jobs.importCompany(row.regionCode, row.partyId))
  }
}
