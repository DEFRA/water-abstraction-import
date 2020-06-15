'use strict';

const { experiment, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const { createServerForRoute } = require('../../test-helpers');
const routes = require('../../../src/modules/core/routes');

experiment('modules/core/routes', () => {
  experiment('/status', () => {
    it('exists', async () => {
      const request = { method: 'GET', url: '/status' };
      const server = createServerForRoute(routes[0]);

      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });
  });

  experiment('/etl/testing', () => {
    it('exists', async () => {
      const request = { method: 'GET', url: '/etl/testing' };
      const server = createServerForRoute(routes[1]);

      const response = await server.inject(request);
      expect(response.statusCode).to.equal(200);
    });
  });
});
