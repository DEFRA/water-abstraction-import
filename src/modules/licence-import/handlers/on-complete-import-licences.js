const { logger } = require('../../../logger')
const jobs = require('../jobs')

module.exports = async (messageQueue, job) => {
  logger.info(`Handling onComplete ${job.data.request.name}`)

  try {
    const licenceRows = job.data.response.value
    for (const row of licenceRows) {
      await messageQueue.publish(jobs.importLicence(row.LIC_NO))
    }
  } catch (err) {
    logger.error(`Error handling onComplete ${job.data.request.name}`, err)
    throw err
  }
}
