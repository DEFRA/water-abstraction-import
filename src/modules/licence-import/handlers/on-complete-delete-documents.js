'use strict';

const jobs = require('../jobs');

module.exports = async (messageQueue) => messageQueue.publish(jobs.importPurposeConditionTypes());
