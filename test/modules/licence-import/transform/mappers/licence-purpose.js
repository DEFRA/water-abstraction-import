'use strict';

const {
  beforeEach,
  experiment,
  test
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const data = require('../data');

const { mapLicencePurpose } = require('../../../../../src/modules/licence-import/transform/mappers/licence-purpose');

experiment('modules/licence-import/transform/mappers/licence-purpose', () => {
  experiment('.mapLicencePurpose', () => {
    let mapped;
    let licence;
    let purpose;

    beforeEach(async () => {
      licence = {
        ID: '123',
        FGAC_REGION_CODE: '6',
        STATUS: 'CURR',
        EFF_ST_DATE: '22/12/1989'
      };

      purpose = data.createVersion(licence, {
        AABV_AABL_ID: '123',
        AABV_ISSUE_NO: '100',
        AABV_INCR_NO: '1',
        APUR_APPR_CODE: 'A',
        APUR_APSE_CODE: 'ABC',
        APUR_APUS_CODE: '123',
        PERIOD_ST_DAY: '20',
        PERIOD_ST_MONTH: '10',
        PERIOD_END_DAY: '21',
        PERIOD_END_MONTH: '11',
        ANNUAL_QTY: '1000',
        TIMELTD_ST_DATE: 'null',
        TIMELTD_END_DATE: 'null',
        NOTES: 'test notes',
        FGAC_REGION_CODE: '6'
      });

      mapped = mapLicencePurpose(purpose);
    });

    test('maps the issue number', async () => {
      expect(mapped.issue).to.equal(100);
    });

    test('maps the increment number', async () => {
      expect(mapped.increment).to.equal(1);
    });

    test('maps the primary purpose', async () => {
      expect(mapped.purposePrimary).to.equal('A');
    });

    test('maps the secondary purpose', async () => {
      expect(mapped.purposeSecondary).to.equal('ABC');
    });

    test('maps the purpose use', async () => {
      expect(mapped.purposeUse).to.equal('123');
    });

    test('maps the abstraction period start day', async () => {
      expect(mapped.abstractionPeriodStartDay).to.equal(20);
    });

    test('maps the abstraction period start month', async () => {
      expect(mapped.abstractionPeriodStartMonth).to.equal(10);
    });

    test('maps the abstraction period end day', async () => {
      expect(mapped.abstractionPeriodEndDay).to.equal(21);
    });

    test('maps the abstraction period end month', async () => {
      expect(mapped.abstractionPeriodEndMonth).to.equal(11);
    });

    test('maps the time limited start date to null when string null', async () => {
      expect(mapped.timeLimitedStartDate).to.equal(null);
    });

    test('maps the time limited end date to null when string null', async () => {
      expect(mapped.timeLimitedEndDate).to.equal(null);
    });

    test('maps the time limited start date when not string null', async () => {
      purpose.TIMELTD_ST_DATE = '01/01/2000';
      mapped = mapLicencePurpose(purpose);
      expect(mapped.timeLimitedStartDate).to.equal('2000-01-01');
    });

    test('maps the time limited end date when not string null', async () => {
      purpose.TIMELTD_END_DATE = '01/01/2000';
      mapped = mapLicencePurpose(purpose);
      expect(mapped.timeLimitedEndDate).to.equal('2000-01-01');
    });

    test('maps the notes', async () => {
      expect(mapped.notes).to.equal('test notes');
    });

    test('maps the notes to null when string null', async () => {
      purpose.NOTES = 'null';
      mapped = mapLicencePurpose(purpose);
      expect(mapped.notes).to.equal(null);
    });

    test('maps the annual quantity', async () => {
      expect(mapped.annualQuantity).to.equal(1000);
    });

    test('maps the notes to null when string null', async () => {
      purpose.ANNUAL_QTY = 'null';
      mapped = mapLicencePurpose(purpose);
      expect(mapped.annualQuantity).to.equal(null);
    });
  });
});
