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

const testing = {
  method: 'GET',
  handler: () => 'testing',
  options: {
    auth: false,
    description: 'For testing'
  },
  path: '/etl/testing'
};

module.exports = [status, testing];
