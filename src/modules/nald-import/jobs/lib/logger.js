const { logger } = require('../../../../logger');

const logHandlingJob = job =>
  logger.info(`Handling job: ${job.name}`, job.data);

const logJobError = (job, err) =>
  logger.error(`Error handling job ${job.name}`, err, job.data);

const logFailedJob = job =>
  logger.error(`Job: ${job.data.request.name} failed, aborting`, job.data.request.data);

const logHandlingOnCompleteJob = job =>
  logger.info(`Handling onComplete job: ${job.data.request.name}`, job.data.request.data);

const logHandlingOnCompleteError = (job, err) =>
  logger.error(`Error handling onComplete job: ${job.data.request.name}`, err, job.data.request.data);

const logAbortingOnComplete = job =>
  logger.info(`Aborting onComplete job: ${job.data.request.name}`, job.data);

module.exports = {
  logHandlingJob,
  logFailedJob,
  logJobError,
  logHandlingOnCompleteJob,
  logHandlingOnCompleteError,
  logAbortingOnComplete
};
