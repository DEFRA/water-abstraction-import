'use strict';

const createMessage = jobName => ({
  name: jobName,
  options: {
    singletonKey: jobName
  }
});

module.exports = {
  createMessage
};
