const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const queries = require('../../../../src/modules/licence-import/queries');
const sandbox = require('sinon').createSandbox();
const { pool } = require('../../../../src/lib/connectors/db');

const importConnector = require('../../../../src/modules/licence-import/connectors/import');

const licenceNumber = 'licence_1';
const licenceId = 123;
const regionCode = 2;

experiment('modules/licence-import/connectors/import', () => {
  const data = [{
    foo: 'bar'
  }, {
    bar: 'baz'
  }];

  beforeEach(async () => {
    sandbox.stub(pool, 'query').resolves({ rows: data });
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('getLicence', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getLicence(licenceNumber);
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getLicence);
      expect(params).to.equal([licenceNumber]);
    });

    test('resolves with the first row found', async () => {
      const result = await importConnector.getLicence(licenceNumber);
      expect(result).to.equal(data[0]);
    });
  });

  experiment('getLicenceVersions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getLicenceVersions(regionCode, licenceId);
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getLicenceVersions);
      expect(params).to.equal([regionCode, licenceId]);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getLicenceVersions(licenceNumber);
      expect(result).to.equal(data);
    });
  });

  experiment('getAllParties', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAllParties();
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getAllParties);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAllParties();
      expect(result).to.equal(data);
    });
  });

  experiment('getAllAddresses', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAllAddresses();
      const [query] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getAllAddresses);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAllAddresses();
      expect(result).to.equal(data);
    });
  });

  experiment('getChargeVersions', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getChargeVersions(regionCode, licenceId);
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getChargeVersions);
      expect(params).to.equal([regionCode, licenceId]);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getChargeVersions(regionCode, licenceId);
      expect(result).to.equal(data);
    });
  });

  experiment('getTwoPartTariffAgreements', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getTwoPartTariffAgreements(regionCode, licenceId);
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getTwoPartTariffAgreements);
      expect(params).to.equal([regionCode, licenceId]);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getTwoPartTariffAgreements(regionCode, licenceId);
      expect(result).to.equal(data);
    });
  });

  experiment('getAccountAgreements', () => {
    test('calls pool.query with the correct arguments', async () => {
      await importConnector.getAccountAgreements(regionCode, licenceId);
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal(queries.getAccountAgreements);
      expect(params).to.equal([regionCode, licenceId]);
    });

    test('resolves with all rows found', async () => {
      const result = await importConnector.getAccountAgreements(regionCode, licenceId);
      expect(result).to.equal(data);
    });
  });
});
