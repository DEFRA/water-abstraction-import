'use strict';

const { experiment, it } = exports.lab = require('lab').script();
const { expect } = require('code');

const server = require('../../../index');

experiment('modules/core/routes', () => {
  experiment('/status', () => {
    it('exists', async () => {
      const request = { method: 'GET', url: '/status' };
      const response = await server.inject(request);

      expect(response.statusCode).to.equal(200);
    });
  });

  experiment('/etl/testing', () => {
    it('exists', async () => {
      const request = { method: 'GET', url: '/etl/testing' };
      const response = await server.inject(request);

      expect(response.statusCode).to.equal(200);
    });
  });
});
