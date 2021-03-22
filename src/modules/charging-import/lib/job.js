'use strict';

const createMessage = jobName => ({
  name: jobName,
  options: {
    singletonKey: jobName
  }
});

exports.createMessage = createMessage;
