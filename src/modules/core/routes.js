'use strict';

const status = {
  method: 'GET',
  handler: () => 'ok',
  options: {
    auth: false,
    description: 'Checks if the service is alive'
  },
  path: '/status'
};

module.exports = [status];
