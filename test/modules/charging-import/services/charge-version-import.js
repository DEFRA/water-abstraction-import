'use strict';

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const sandbox = require('sinon').createSandbox();

const chargeVersionImport = require('../../../../src/modules/charging-import/services/charge-version-import');
const { pool } = require('../../../../src/lib/connectors/db');

const queries = {
  charging: require('../../../../src/modules/charging-import/lib/queries/charging'),
  licence: require('../../../../src/modules/charging-import/lib/queries/licences'),
  changeReasons: require('../../../../src/modules/charging-import/lib/queries/change-reasons')
};

const NALD_GAP_ID = 'nald-gap-change-reason-id';

const REGION_CODE = 1;
const LICENCE_ID = 'test-licence-id';
const LICENCE_NUMBER = '01/234/ABC';
const START_DATE = '2019-01-01';

const chargeVersionRow = {
  start_date: START_DATE,
  end_date: null,
  version_number: 1,
  status: 'current',
  external_id: '1:123:1',
  licence_ref: LICENCE_NUMBER,
  source: 'nald',
  invoice_account_id: 'test-invoice-account-id',
  company_id: 'test-company-id',
  scheme: 'alcs',
  apportionment: false,
  error: false,
  billed_upto_date: '2020-03-31',
  region: REGION_CODE
};

experiment('modules/charging-import/services/charge-version-import.js', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.importChargeVersions', () => {
    beforeEach(async () => {
      pool.query.withArgs(queries.changeReasons.getNALDGapChangeReason).resolves({
        rows: [{
          change_reason_id: NALD_GAP_ID
        }]
      });

      pool.query.withArgs(queries.licence.getLicences).resolves({
        rows: [{
          ID: LICENCE_ID,
          LIC_NO: LICENCE_NUMBER,
          FGAC_REGION_CODE: REGION_CODE,
          start_date: START_DATE,
          end_date: null
        }]
      });

      pool.query.withArgs(
        queries.charging.getNonDraftChargeVersionsForLicence, [REGION_CODE, LICENCE_ID]
      ).resolves({
        rows: [
          chargeVersionRow
        ]
      });

      await chargeVersionImport.importChargeVersions();
    });

    test('the NALD gap change reason ID is fetched', async () => {
      expect(pool.query.calledWith(queries.changeReasons.getNALDGapChangeReason)).to.be.true();
    });

    test('the licences are fetched', async () => {
      expect(pool.query.calledWith(queries.licence.getLicences)).to.be.true();
    });

    test('the charge versions are fetched for the licence region and ID', async () => {
      expect(pool.query.calledWith(
        queries.charging.getNonDraftChargeVersionsForLicence,
        [REGION_CODE, LICENCE_ID]
      )).to.be.true();
    });

    test('the mapped charge versions are persisted', async () => {
      expect(pool.query.calledWith(
        queries.charging.insertChargeVersion,
        [
          START_DATE,
          chargeVersionRow.end_date,
          chargeVersionRow.status,
          LICENCE_NUMBER,
          REGION_CODE,
          chargeVersionRow.source,
          chargeVersionRow.version_number,
          chargeVersionRow.invoice_account_id,
          chargeVersionRow.company_id,
          chargeVersionRow.billed_upto_date,
          chargeVersionRow.error,
          chargeVersionRow.scheme,
          chargeVersionRow.external_id,
          chargeVersionRow.apportionment,
          null
        ]
      )).to.be.true();
    });

    test('unwanted charge versions are cleaned up', async () => {
      const [query, params] = pool.query.lastCall.args;
      expect(query).to.equal("delete from water.charge_versions where licence_ref=$1 and source='nald' and external_id not in ($2)");
      expect(params).to.equal([
        LICENCE_NUMBER,
        chargeVersionRow.external_id
      ]);
    });
  });
});
