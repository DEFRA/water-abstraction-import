'use strict'

const jobs = require('../jobs')
const importCompanies = require('../connectors/import-companies')

module.exports = async (messageQueue) => {
  try {
    const count = await importCompanies.getPendingCount()

    if (count === 0) {
      await messageQueue.deleteQueue('__state__completed__import.company')
      await messageQueue.publish(jobs.importLicences())

      global.GlobalNotifier.omg('import.company: finished')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('import.company: errored', error)
    throw error
  }
}
