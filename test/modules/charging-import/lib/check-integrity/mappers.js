const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const mappers = require('../../../../../src/modules/charging-import/lib/check-integrity/mappers.js');
const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/lib/check-integrity/mappers.js', () => {

  experiment('mapChargeVersion', () => {

    const createChargeVersion = (options = {}) => ({
      external_id: 123,
      version_number: 100,
      start_date: '2019-01-01',
      status: 'current',
      apportionment: true,
      error: false,
      end_date: null,
      billed_upto_date: '2019-02-14',
      region_code: 3,
      ...options
    });

    test('maps imported charge version data back to original format', async() => {
      const result = mappers.mapChargeVersion(createChargeVersion());
      expect(result).to.equal({
        AABL_ID: '123',
        VERS_NO: '100',
        EFF_ST_DATE: '01/01/2019',
        STATUS: 'CURR',
        APPORTIONMENT: 'Y',
        IN_ERROR_STATUS: 'N',
        EFF_END_DATE: 'null',
        BILLED_UPTO_DATE: '14/02/2019',
        FGAC_REGION_CODE: '3'
      });
    });

    test('maps superseded status', async() => {
      const result = mappers.mapChargeVersion(createChargeVersion({
        status: 'superseded'
      }));
      expect(result.STATUS).to.equal('SUPER');
    });

    test('maps draft status', async() => {
      const result = mappers.mapChargeVersion(createChargeVersion({
        status: 'draft'
      }));
      expect(result.STATUS).to.equal('DRAFT');
    });
  });


  experiment('mapChargeElement', () => {

    const createChargeElement = (options = {}) => ({
      external_id: 123,
      abstraction_period_start_day: 1,
      abstraction_period_start_month: 2,
      abstraction_period_end_day: 3,
      abstraction_period_end_month: 4,
      authorised_annual_quantity: 125.56,
      season: 'summer',
      season_derived: 'winter',
      source: 'supported',
      loss: 'low',
      purpose_primary: 'A',
      purpose_secondary: 'AGG',
      purpose_tertiary: '123',
      factors_overridden: true,
      billable_annual_quantity: null,
      time_limited_start_date: '2019-04-01',
      time_limited_end_date: '2019-09-01',
      description: 'Description of element',
      ...options
    });

    test('maps imported charge element data back to original format', async() => {
      const result = mappers.mapChargeElement(createChargeElement());
      expect(result).to.equal({
        ID: '123',
        ABS_PERIOD_ST_DAY: '1',
        ABS_PERIOD_ST_MONTH: '2',
        ABS_PERIOD_END_DAY: '3',
        ABS_PERIOD_END_MONTH: '4',
        AUTH_ANN_QTY: '125.56',
        ASFT_CODE: 'S',
        ASFT_CODE_DERIVED: 'W',
        ASRF_CODE: 'S',
        ALSF_CODE: 'L',
        APUR_APPR_CODE: 'A',
        APUR_APSE_CODE: 'AGG',
        APUR_APUS_CODE: '123',
        FCTS_OVERRIDDEN: 'Y',
        BILLABLE_ANN_QTY: 'null',
        TIMELTD_ST_DATE: '01/04/2019',
        TIMELTD_END_DATE: '01/09/2019',
        DESCR: 'Description of element'
      });
    });
  });

  experiment('mapChargeAgreement', () => {

    const createChargeAgreement = (options = {}) => ({
      agreement_code: 'INST',
      start_date: '2017-08-01',
      end_date: null,
      signed_date: '2017-10-01',
      file_reference: '01/23',
      description: 'Text here'
    });

    test('maps imported charge agreement data back to original format', async() => {
      const result = mappers.mapChargeAgreement(createChargeAgreement());
      expect(result).to.equal({
        AFSA_CODE: 'INST',
        EFF_ST_DATE: '01/08/2017',
        EFF_END_DATE: 'null',
        SIGNED_DATE: '01/10/2017',
        FILE_REF: '01/23',
        TEXT: 'Text here'
      });
    });
  });

});
