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
          count: 1
        },
        {
          name: '__state__completed__nald-import.s3-download',
          state: 'completed',
          count: 2
        },
        {
          name: 'nald-import.populate-pending-import',
          state: 'completed',
          count: 3
        },
        {
          name: '__state__completed__nald-import.populate-pending-import',
          state: 'completed',
          count: 4
        },
        {
          name: 'nald-import.import-licence',
          state: 'completed',
          count: 5
        },
        {
          name: 'something-else',
          state: 'completed',
          count: 6
        },
        {
          name: '__state__completed__something-else',
          state: 'completed',
          count: 7
        }
      ]);

      result = await controller.getJobSummary();
    });

    test('calls through to the job connector', async () => {
      expect(jobConnector.getJobSummary.called).to.equal(true);
    });

    test('returns the data from the connector formatted when mapped', async () => {
      const download = result.find(res => res.name === 'NALD import: download');
      const downloadComplete = result.find(res => res.name === 'NALD import: download: complete');
      const populatePending = result.find(res => res.name === 'NALD import: populate pending import');
      const populatePendingComplete = result.find(res => res.name === 'NALD import: populate pending import: complete');
      const importLicence = result.find(res => res.name === 'NALD import: import licence');

      expect(download.state).to.equal('completed');
      expect(download.count).to.equal(1);

      expect(downloadComplete.state).to.equal('completed');
      expect(downloadComplete.count).to.equal(2);

      expect(populatePending.state).to.equal('completed');
      expect(populatePending.count).to.equal(3);

      expect(populatePendingComplete.state).to.equal('completed');
      expect(populatePendingComplete.count).to.equal(4);

      expect(importLicence.state).to.equal('completed');
      expect(importLicence.count).to.equal(5);
    });

    test('returns the data formatted when no explicit mapping', async () => {
      const other = result.find(res => res.name === 'something else');
      const otherComplete = result.find(res => res.name === 'something else: complete');

      expect(other.state).to.equal('completed');
      expect(other.count).to.equal(6);

      expect(otherComplete.state).to.equal('completed');
      expect(otherComplete.count).to.equal(7);
    });

    test('returns the expected number of items', async () => {
      expect(result.length).to.equal(7);
    });

    test('returns the content in alphabetical order', async () => {
      expect(result[0].name).to.equal('NALD import: download');
      expect(result[1].name).to.equal('NALD import: download: complete');
      expect(result[2].name).to.equal('NALD import: import licence');
      expect(result[3].name).to.equal('NALD import: populate pending import');
      expect(result[4].name).to.equal('NALD import: populate pending import: complete');
      expect(result[5].name).to.equal('something else');
      expect(result[6].name).to.equal('something else: complete');
    });
  });
});
