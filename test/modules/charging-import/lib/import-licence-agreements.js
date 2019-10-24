const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const { expect } = require('code');
const importLicenceAgreements = require('../../../../src/modules/charging-import/lib/import-licence-agreements');
const { logger } = require('../../../../src/logger');
const queries = require('../../../../src/modules/charging-import/lib/queries/agreements');
const { pool } = require('../../../../src/lib/connectors/db');

const createRow = (code, startDate, endDate, licenceNumber = '01/123') => ({
  LIC_NO: licenceNumber,
  AFSA_CODE: code,
  start_date: startDate,
  end_date: endDate
});

experiment('modules/crm/lib/import-licence-agreements', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query');
    sandbox.stub(logger, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('importLicenceAgreements', () => {
    beforeEach(async () => {
      pool.query.withArgs(queries.getTwoPartTariffAgreements).resolves({
        rows: []
      });
    });

    experiment('when licence/code is the same and date ranges are adjacent', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.getAccountAgreements).resolves({
          rows: [
            createRow('S130U', '2018-01-01', '2018-01-31'),
            createRow('S130U', '2018-02-01', '2018-02-28'),
            createRow('S130U', '2018-03-01', '2018-03-30')
          ]
        });
        await importLicenceAgreements.importLicenceAgreements();
      });

      test('1 row is inserted', async () => {
        expect(pool.query.callCount).to.equal(3);
      });

      test('the date ranges are merged', async () => {
        const [query, params] = pool.query.lastCall.args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S130U', '2018-01-01', '2018-03-30'
        ]);
      });
    });

    experiment('when the agreement codes are different and date ranges are adjacent', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.getAccountAgreements).resolves({
          rows: [
            createRow('S130U', '2018-01-01', '2018-01-31'),
            createRow('S130T', '2018-02-01', '2018-02-28'),
            createRow('S127', '2018-03-01', '2018-03-30')
          ]
        });
        await importLicenceAgreements.importLicenceAgreements();
      });

      test('3 rows are inserted', async () => {
        expect(pool.query.callCount).to.equal(5);
      });

      test('the first row is inserted', async () => {
        const [query, params] = pool.query.getCall(2).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S130U', '2018-01-01', '2018-01-31'
        ]);
      });

      test('the second row is inserted', async () => {
        const [query, params] = pool.query.getCall(3).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S130T', '2018-02-01', '2018-02-28'
        ]);
      });

      test('the third row is inserted', async () => {
        const [query, params] = pool.query.getCall(4).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S127', '2018-03-01', '2018-03-30'
        ]);
      });
    });

    experiment('when the licence numbers are different and date ranges are adjacent', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.getAccountAgreements).resolves({
          rows: [
            createRow('S127', '2018-01-01', '2018-01-31', 'a'),
            createRow('S127', '2018-02-01', '2018-02-28', 'b'),
            createRow('S127', '2018-03-01', '2018-03-30', 'c')
          ]
        });
        await importLicenceAgreements.importLicenceAgreements();
      });

      test('3 rows are inserted', async () => {
        expect(pool.query.callCount).to.equal(5);
      });

      test('the first row is inserted', async () => {
        const [query, params] = pool.query.getCall(2).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          'a', 'S127', '2018-01-01', '2018-01-31'
        ]);
      });

      test('the second row is inserted', async () => {
        const [query, params] = pool.query.getCall(3).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          'b', 'S127', '2018-02-01', '2018-02-28'
        ]);
      });

      test('the third row is inserted', async () => {
        const [query, params] = pool.query.getCall(4).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          'c', 'S127', '2018-03-01', '2018-03-30'
        ]);
      });
    });

    experiment('when the date ranges are not adjacent', () => {
      beforeEach(async () => {
        pool.query.withArgs(queries.getAccountAgreements).resolves({
          rows: [
            createRow('S127', '2018-01-01', '2018-01-31'),
            createRow('S127', '2018-02-02', '2018-02-28'),
            createRow('S127', '2018-03-02', '2018-03-30')
          ]
        });
        await importLicenceAgreements.importLicenceAgreements();
      });

      test('3 rows are inserted', async () => {
        expect(pool.query.callCount).to.equal(5);
      });

      test('the first row is inserted', async () => {
        const [query, params] = pool.query.getCall(2).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S127', '2018-01-01', '2018-01-31'
        ]);
      });

      test('the second row is inserted', async () => {
        const [query, params] = pool.query.getCall(3).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S127', '2018-02-02', '2018-02-28'
        ]);
      });

      test('the third row is inserted', async () => {
        const [query, params] = pool.query.getCall(4).args;
        expect(query).to.equal(queries.insertLicenceAgreement);
        expect(params).to.equal([
          '01/123', 'S127', '2018-03-02', '2018-03-30'
        ]);
      });
    });
  });
});
