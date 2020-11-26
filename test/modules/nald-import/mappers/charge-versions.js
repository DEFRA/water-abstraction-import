'use strict';

const { test, experiment, beforeEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const mapper = require('../../../../src/modules/nald-import/mappers/charge-versions');

const NALD_GAP_ID = 'nald-gap-id';
const STATUS_SUPERSEDED = 'superseded';
const STATUS_CURRENT = 'current';
const WATER_LICENCE_ID = '00000000-0000-0000-0000-000000000000';

const getLicence = (overrides = {}) => ({
  ID: '1',
  licence_id: WATER_LICENCE_ID,
  LIC_NO: '01/234/ABC',
  FGAC_REGION_CODE: '1',
  start_date: '2018-01-01',
  end_date: overrides.end_date || null
});

experiment('modules/nald-import/mappers/charge-versions.js', () => {
  let result;

  experiment('.mapNALDChargeVersionsToWRLS', () => {
    experiment('when the are no NALD charge versions, and licence has no end date', () => {
      beforeEach(async () => {
        const licence = getLicence();
        result = mapper.mapNALDChargeVersionsToWRLS(licence, [], NALD_GAP_ID);
      });

      test('there is a single charge version', async () => {
        expect(result).to.be.an.array().length(1);
      });

      test('the charge version is a NALD gap with same date range as licence', async () => {
        const [cv] = result;
        expect(cv.is_nald_gap).to.be.true();
        expect(cv.start_date).to.equal('2018-01-01');
        expect(cv.end_date).to.equal(null);
        expect(cv.status).to.equal(STATUS_CURRENT);
      });
    });

    experiment('when the are no NALD charge versions, and licence has an end date', () => {
      beforeEach(async () => {
        const licence = getLicence({ end_date: '2020-01-01' });
        result = mapper.mapNALDChargeVersionsToWRLS(licence, [], NALD_GAP_ID);
      });

      test('there is a single charge version', async () => {
        expect(result).to.be.an.array().length(1);
      });

      test('the charge version is a NALD gap with same date range as licence', async () => {
        const [cv] = result;
        expect(cv.is_nald_gap).to.be.true();
        expect(cv.start_date).to.equal('2018-01-01');
        expect(cv.end_date).to.equal('2020-01-01');
        expect(cv.status).to.equal(STATUS_CURRENT);
      });
    });

    experiment('when there are gaps in a charge version history', () => {
      beforeEach(async () => {
        const licence = getLicence();
        const chargeVersions = [
          {
            external_id: '1:1:1',
            status: STATUS_SUPERSEDED,
            version_number: 1,
            start_date: '2018-02-01',
            end_date: '2019-01-01',
            licence_id: WATER_LICENCE_ID
          },
          {
            external_id: '1:1:2',
            status: STATUS_CURRENT,
            version_number: 2,
            start_date: '2019-02-01',
            end_date: '2020-01-01',
            licence_id: WATER_LICENCE_ID
          }
        ];
        result = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions, NALD_GAP_ID);
      });

      test('there are 5 charge versions', async () => {
        expect(result).to.be.an.array().length(5);
      });

      test('the 0th element is a NALD gap inserted from the licence start date to the first charge version', async () => {
        const cv = result[0];
        expect(cv.is_nald_gap).to.be.true();
        expect(cv.start_date).to.equal('2018-01-01');
        expect(cv.end_date).to.equal('2018-01-31');
        expect(cv.status).to.equal(STATUS_CURRENT);
      });

      test('the 1st element is the first NALD charge version', async () => {
        const cv = result[1];
        expect(cv.change_reason_id).to.be.undefined();
        expect(cv.external_id).to.equal('1:1:1');
        expect(cv.status).to.equal(STATUS_CURRENT);
        expect(cv.licence_id).to.equal(WATER_LICENCE_ID);
      });

      test('the 2nd element is a NALD gap inserted between non-adjacent charge versions', async () => {
        const cv = result[2];
        expect(cv.is_nald_gap).to.be.true();
        expect(cv.start_date).to.equal('2019-01-02');
        expect(cv.end_date).to.equal('2019-01-31');
        expect(cv.status).to.equal(STATUS_CURRENT);
      });

      test('the 3rd element is the second NALD charge version', async () => {
        const cv = result[3];
        expect(cv.change_reason_id).to.be.undefined();
        expect(cv.external_id).to.equal('1:1:2');
        expect(cv.status).to.equal(STATUS_CURRENT);
        expect(cv.licence_id).to.equal(WATER_LICENCE_ID);
      });

      test('the 4th element is a NALD gap inserted from the last charge version to the licence end date', async () => {
        const cv = result[4];
        expect(cv.is_nald_gap).to.be.true();
        expect(cv.start_date).to.equal('2020-01-02');
        expect(cv.end_date).to.equal(null);
        expect(cv.status).to.equal(STATUS_CURRENT);
      });
    });

    experiment('when a charge version is marked in error', () => {
      beforeEach(async () => {
        const licence = getLicence();
        const chargeVersions = [
          {
            external_id: '1:1:1',
            status: STATUS_SUPERSEDED,
            version_number: 1,
            start_date: '2018-01-01',
            end_date: '2018-01-01',
            error: true,
            licence_id: WATER_LICENCE_ID
          },
          {
            external_id: '1:1:2',
            status: STATUS_CURRENT,
            version_number: 2,
            start_date: '2018-01-01',
            end_date: null,
            licence_id: WATER_LICENCE_ID
          }
        ];
        result = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions, NALD_GAP_ID);
      });

      test('there are 2 charge versions', async () => {
        expect(result).to.be.an.array().length(2);
      });

      test('the 0th element is mapped to "superseded"', async () => {
        const cv = result[0];
        expect(cv.change_reason_id).to.be.undefined();
        expect(cv.start_date).to.equal('2018-01-01');
        expect(cv.end_date).to.equal('2018-01-01');
        expect(cv.status).to.equal(STATUS_SUPERSEDED);
        expect(cv.licence_id).to.equal(WATER_LICENCE_ID);
      });

      test('the 1st element is mapped to "current"', async () => {
        const cv = result[1];
        expect(cv.change_reason_id).to.be.undefined();
        expect(cv.start_date).to.equal('2018-01-01');
        expect(cv.end_date).to.equal(null);
        expect(cv.status).to.equal(STATUS_CURRENT);
        expect(cv.licence_id).to.equal(WATER_LICENCE_ID);
      });
    });

    experiment('when a charge version pre-dates the licence start date', () => {
      beforeEach(async () => {
        const licence = getLicence();
        const chargeVersions = [
          {
            external_id: '1:1:1',
            status: STATUS_SUPERSEDED,
            version_number: 1,
            start_date: '1979-01-01',
            end_date: '2018-03-31',
            licence_id: WATER_LICENCE_ID
          },
          {
            external_id: '1:1:2',
            status: STATUS_CURRENT,
            version_number: 2,
            start_date: '2018-04-01',
            end_date: null,
            licence_id: WATER_LICENCE_ID
          }
        ];
        result = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions, NALD_GAP_ID);
      });

      test('does not insert nald gap charge versions', async () => {
        expect(result).to.be.an.array().length(2);
        const ids = result.map(row => row.external_id);
        expect(ids).to.only.include(['1:1:1', '1:1:2']);
      });
    });

    experiment('when a charge version has the same start and end dates, and the same start date as the following charge version', () => {
      beforeEach(async () => {
        const licence = getLicence();
        const chargeVersions = [
          {
            external_id: '1:1:1',
            status: STATUS_SUPERSEDED,
            version_number: 1,
            start_date: '2018-01-01',
            end_date: '2018-01-01',
            licence_id: WATER_LICENCE_ID
          },
          {
            external_id: '1:1:2',
            status: STATUS_CURRENT,
            version_number: 2,
            start_date: '2018-01-01',
            end_date: null,
            licence_id: WATER_LICENCE_ID
          }
        ];
        result = mapper.mapNALDChargeVersionsToWRLS(licence, chargeVersions, NALD_GAP_ID);
      });

      test('there are 2 charge versions', async () => {
        expect(result).to.be.an.array().length(2);
      });

      test('the first charge version has its dates unchanged', async () => {
        expect(result[0].start_date).to.equal('2018-01-01');
        expect(result[0].end_date).to.equal('2018-01-01');
        expect(result[0].status).to.equal(STATUS_SUPERSEDED);
      });

      test('the second charge version has its dates unchanged', async () => {
        expect(result[1].start_date).to.equal('2018-01-01');
        expect(result[1].end_date).to.equal(null);
        expect(result[1].status).to.equal(STATUS_CURRENT);
      });
    });
  });
});
