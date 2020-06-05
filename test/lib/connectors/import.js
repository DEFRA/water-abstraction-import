'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { pool } = require('../../../src/lib/connectors/db');
const importConnector = require('../../../src/lib/connectors/import');

experiment('lib/connectors/import', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query').resolves({});
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.getLicenceNumbers', () => {
    experiment('when no data is returned', () => {
      test('an empty array is returned', async () => {
        const licenceNumbers = await importConnector.getLicenceNumbers();
        expect(licenceNumbers).to.equal([]);
      });
    });

    experiment('when data is returned', () => {
      test('the rows are returned', async () => {
        pool.query.resolves({
          rows: ['01/01', '01/02']
        });
        const licenceNumbers = await importConnector.getLicenceNumbers();
        expect(licenceNumbers).to.equal(['01/01', '01/02']);
      });
    });
  });
});
