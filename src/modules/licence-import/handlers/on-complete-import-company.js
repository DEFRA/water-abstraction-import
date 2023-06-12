'use strict'

const jobs = require('../jobs')
const importCompanies = require('../connectors/import-companies')

module.exports = async (messageQueue) => {
  const count = await importCompanies.getPendingCount()

  if (count === 0) {
    await messageQueue.deleteQueue('__state__completed__import.company')
    await messageQueue.publish(jobs.importLicences())
  }
}
