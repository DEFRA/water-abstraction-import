const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const sandbox = require('sinon').createSandbox();

const importConnector = require('../../../../src/modules/licence-import/connectors/import-companies');
const queries = require('../../../../src/modules/licence-import/connectors/queries/import-companies');
const { pool } = require('../../../../src/lib/connectors/db');

experiment('modules/licence-import/connectors/import-companies', () => {
  let result;

  beforeEach(async () => {
    sandbox.stub(pool, 'query');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.clear', () => {
    beforeEach(async () => {
      await importConnector.clear();
    });

    test('the correct query is called', async () => {
      expect(pool.query.calledWith(queries.clear));
    });
  });

  experiment('.initialise', () => {
    const data = {
      rows: [
        { region_code: 3, party_id: 124 },
        { region_code: 5, party_id: 789 }
      ]
    };

    beforeEach(async () => {
      pool.query.resolves(data);
      result = await importConnector.initialise();
    });

    test('the correct query is called', async () => {
      expect(pool.query.calledWith(queries.initialise));
    });

    test('the function resolves with the correct data', async () => {
      expect(result).to.equal(data.rows);
    });
  });

  experiment('.setImportedStatus', () => {
    const regionCode = 3;
    const partyId = 123;

    beforeEach(async () => {
      result = await importConnector.setImportedStatus(regionCode, partyId);
    });

    test('the correct query is called with the region code and party ID params', async () => {
      expect(pool.query.calledWith(queries.setImportedStatus, [regionCode, partyId]));
    });
  });

  experiment('.getPendingCount', () => {
    const data = {
      rows: [
        { count: '3' }
      ]
    };

    beforeEach(async () => {
      pool.query.resolves(data);
      result = await importConnector.getPendingCount();
    });

    test('the correct query is called', async () => {
      expect(pool.query.calledWith(queries.getPendingCount));
    });

    test('the function resolves with the count converted to an integer', async () => {
      expect(result).to.equal(3);
    });
  });
});
