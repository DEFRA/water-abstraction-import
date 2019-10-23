const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const checkIntegrity = require('../../../../../src/modules/charging-import/lib/check-integrity/index.js');
const mappers = require('../../../../../src/modules/charging-import/lib/check-integrity/mappers.js');

const sandbox = require('sinon').createSandbox();
const db = require('../../../../../src/lib/connectors/db');

experiment('modules/charging-import/lib/check-integrity/index.js', () => {
  beforeEach(async () => {
    sandbox.stub(db.pool, 'query').resolves({
      rows: [{
        foo: 'bar'
      }]
    });
    sandbox.stub(mappers, 'mapChargeVersion').returns({
      foo: 'bar'
    });
    sandbox.stub(mappers, 'mapChargeElement').returns({
      bar: 'foo'
    });
    sandbox.stub(mappers, 'mapChargeAgreement').returns({
      foo: 'bar'
    });
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('verify', () => {
    let result;

    experiment('checks the differences between source and target tables in data migration', () => {
      beforeEach(async () => {
        result = await checkIntegrity.verify();
      });

      test('reports total error count', async () => {
        expect(result.totalErrors).to.equal(1);
      });

      test('reports table row count count', async () => {
        expect(result.chargeVersions.sourceRowCount).to.equal(1);
        expect(result.chargeVersions.targetRowCount).to.equal(1);
      });

      test('reports 0 errors for tables with no errors', async () => {
        expect(result.chargeVersions.errors).to.equal([]);
        expect(result.chargeAgreements.errors).to.equal([]);
      });

      test('reports errors in array for tables with errors', async () => {
        const [error] = result.chargeElements.errors;
        expect(error.message).to.equal('Row 0 - difference in key bar');
        expect(error.data.source).to.equal({ foo: 'bar' });
        expect(error.data.target).to.equal({ bar: 'foo' });
      });
    });

    experiment('checks row counts in source/target data', () => {
      beforeEach(async () => {
        db.pool.query.onCall(0).resolves({
          rows: [{
            foo: 'bar'
          }, {
            foo: 'bar'
          }]
        });

        result = await checkIntegrity.verify();
      });

      test('reports error when row count differs', async () => {
        expect(result.totalErrors).to.equal(2);
        expect(result.chargeVersions.errors[0].message).to.equal(
          'Source has 2 records, target 1'
        );
      });
    });
  });
});
