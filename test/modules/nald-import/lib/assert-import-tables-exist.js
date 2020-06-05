const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const assertImportTablesExist = require('../../../../src/modules/nald-import/lib/assert-import-tables-exist');
const coreQueries = require('../../../../src/modules/nald-import/lib/nald-queries/core');
const { NALDImportTablesError } = require('../../../../src/modules/nald-import/lib/errors');

experiment('modules/nald-import/lib/assert-import-tables-exist', () => {
  beforeEach(async () => {
    sandbox.stub(coreQueries, 'importTableExists');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.assertImportTablesExist', () => {
    experiment('when tables exist', () => {
      beforeEach(async () => {
        coreQueries.importTableExists.resolves(true);
      });

      test('resolves undefined', async () => {
        const result = await assertImportTablesExist.assertImportTablesExist();
        expect(result).to.be.undefined();
      });
    });

    experiment('when tables do not exist', () => {
      beforeEach(async () => {
        coreQueries.importTableExists.resolves(false);
      });

      test('rejects with a NALDImportTablesError error', async () => {
        const func = () => assertImportTablesExist.assertImportTablesExist();
        const err = await expect(func()).to.reject();
        expect(err instanceof NALDImportTablesError);
      });
    });
  });
});
