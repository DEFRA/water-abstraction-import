'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const jobConnector = require('../../../src/lib/connectors/water-import/jobs');
const controller = require('../../../src/modules/jobs/controller');

experiment('modules/job-summary/controller', () => {
  beforeEach(async () => {
    sandbox.stub(jobConnector, 'getJobSummary');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.getJobSummary', () => {
    let result;

    beforeEach(async () => {
      jobConnector.getJobSummary.resolves([
        {
          name: 'nald-import.s3-download',
          state: 'completed',
          count: '5'
        }
      ]);

      result = await controller.getJobSummary();
    });

    test('calls through to the job connector', async () => {
      expect(jobConnector.getJobSummary.called).to.equal(true);
    });

    test('returns the data from the connector', async () => {
      expect(result).to.equal([
        {
          name: 'nald-import.s3-download',
          state: 'completed',
          count: '5'
        }
      ]);
    });
  });
});
