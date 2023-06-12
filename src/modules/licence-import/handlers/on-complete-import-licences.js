'use strict'

const jobs = require('../jobs')

module.exports = async (messageQueue, job) => {
  const { value: licences } = job.data.response

  for (const licence of licences) {
    await messageQueue.publish(jobs.importLicence(licence.LIC_NO))
  }

  global.GlobalNotifier.omg('import.companies: finished')
}
