'use strict';

const { experiment, it } = module.exports.lab = require('lab').script();
const { expect } = require('code');

const server = require('../../../index');

experiment('status', () => {
  it('exists', async () => {

    const request = { method: 'GET', url: '/status' };
    const response = await server.inject(request);

    expect(response.statusCode).to.equal(200);
    expect(response.payload).to.equal('ok');
  });
});
