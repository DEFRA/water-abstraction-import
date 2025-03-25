'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, before, after } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const NaldDataGenerator = require('../../../scripts/licence-creator/index.js')
const processHelper = require('@envage/water-abstraction-helpers').process
const ExtractNaldDataProcess = require('../../../src/modules/extract-nald-data/process.js')

// Things we need to stub
const S3 = require('../../../src/modules/extract-nald-data/lib/s3.js')
const Zip = require('../../../src/modules/extract-nald-data/lib/zip.js')

// Thing under test
const PermitJson = require('../../../src/lib/permit-json/permit-json.js')

experiment('lib/permit-json/permit-json.js', () => {
  before(async () => {
    // NOTE: We use the same test arrangement as test/modules/extract-nald-data/process.test.js to create an
    // environment where NALD data is sat in the `import` schema. We can then call PermitJson for that licence and
    // confirm it returns the NALD data transformed into the `permitJson` object that is used by a number of
    // the processes.
    Sinon.stub(S3, 'download').resolves()
    Sinon.stub(Zip, 'extract').callsFake(async () => {
      await NaldDataGenerator()
      await processHelper.execCommand("cp ./test/dummy-csv/* './temp/NALD'")
    })

    await ExtractNaldDataProcess.go()
  })

  after(() => {
    Sinon.restore()
  })

  experiment('when called', () => {
    test('transforms the NALD data into the expected JSON "permit" representation', async () => {
      const result = await PermitJson.go('12/34/56/78')

      expect(result).to.equal({
        ID: '1000000001',
        LIC_NO: '12/34/56/78',
        AREP_SUC_CODE: 'ARSUC',
        AREP_AREA_CODE: 'ARCA',
        SUSP_FROM_BILLING: 'N',
        AREP_LEAP_CODE: 'C4',
        EXPIRY_DATE: '01/01/2220',
        ORIG_EFF_DATE: '01/01/2018',
        ORIG_SIG_DATE: 'null',
        ORIG_APP_NO: 'null',
        ORIG_LIC_NO: 'null',
        NOTES: null,
        REV_DATE: 'null',
        LAPSED_DATE: 'null',
        SUSP_FROM_RETURNS: 'null',
        AREP_CAMS_CODE: '100',
        X_REG_IND: 'N',
        PREV_LIC_NO: 'null',
        FOLL_LIC_NO: 'null',
        AREP_EIUC_CODE: 'ANOTH',
        FGAC_REGION_CODE: '1',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:02:11',
        vmlVersion: 2,
        data: {
          versions: [
            {
              AABL_ID: '1000000001',
              ISSUE_NO: '100',
              INCR_NO: '0',
              AABV_TYPE: 'ISSUE',
              EFF_ST_DATE: '01/01/2018',
              STATUS: 'CURR',
              RETURNS_REQ: 'Y',
              CHARGEABLE: 'Y',
              ASRC_CODE: 'SWSOS',
              ACON_APAR_ID: '1000000003',
              ACON_AADD_ID: '1000000004',
              ALTY_CODE: 'LOR',
              ACCL_CODE: 'CR',
              MULTIPLE_LH: 'N',
              LIC_SIG_DATE: 'null',
              APP_NO: 'null',
              LIC_DOC_FLAG: 'null',
              EFF_END_DATE: 'null',
              EXPIRY_DATE1: 'null',
              WA_ALTY_CODE: 'TEST',
              VOL_CONV: 'N',
              WRT_CODE: 'N',
              DEREG_CODE: 'CONF',
              FGAC_REGION_CODE: '1',
              parties: [
                {
                  ID: '1000000003',
                  APAR_TYPE: 'PER',
                  NAME: 'Doe',
                  SPOKEN_LANG: 'E',
                  WRITTEN_LANG: 'E',
                  LAST_CHANGED: '25/03/2025',
                  DISABLED: 'N',
                  FORENAME: 'John',
                  INITIALS: 'H',
                  SALUTATION: 'Mr',
                  REF: 'null',
                  DESCR: 'null',
                  LOCAL_NAME: 'null',
                  ASIC_ASID_DIVISION: 'null',
                  ASIC_CLASS: 'null',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:11',
                  contacts: [
                    {
                      APAR_ID: '1000000003',
                      AADD_ID: '1000000004',
                      DISABLED: 'N',
                      FGAC_REGION_CODE: '1',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:02:11',
                      party_address: {
                        ID: '1000000004',
                        ADDR_LINE_1: 'Daisy cow farm',
                        LAST_CHANGED: '01/01/2018 09:00:00',
                        DISABLED: 'N',
                        ADDR_LINE_2: 'Long road',
                        ADDR_LINE_3: 'null',
                        ADDR_LINE_4: 'null',
                        TOWN: 'Daisybury',
                        COUNTY: 'Testingshire',
                        POSTCODE: 'TT1 1TT',
                        COUNTRY: 'null',
                        APCO_CODE: 'TEST',
                        FGAC_REGION_CODE: '1',
                        SOURCE_CODE: 'NALD',
                        BATCH_RUN_DATE: '12/02/2018 20:02:11'
                      }
                    }
                  ]
                }
              ]
            }
          ],
          current_version: {
            licence: {
              AABL_ID: '1000000001',
              ISSUE_NO: '100',
              INCR_NO: '0',
              AABV_TYPE: 'ISSUE',
              EFF_ST_DATE: '01/01/2018',
              STATUS: 'CURR',
              RETURNS_REQ: 'Y',
              CHARGEABLE: 'Y',
              ASRC_CODE: 'SWSOS',
              ACON_APAR_ID: '1000000003',
              ACON_AADD_ID: '1000000004',
              ALTY_CODE: 'LOR',
              ACCL_CODE: 'CR',
              MULTIPLE_LH: 'N',
              LIC_SIG_DATE: 'null',
              APP_NO: 'null',
              LIC_DOC_FLAG: 'null',
              EFF_END_DATE: 'null',
              EXPIRY_DATE1: 'null',
              WA_ALTY_CODE: 'TEST',
              VOL_CONV: 'N',
              WRT_CODE: 'N',
              DEREG_CODE: 'CONF',
              FGAC_REGION_CODE: '1',
              CODE: 'TEST',
              DESCR: 'Test licence type',
              DISABLED: 'N',
              DISP_ORD: 'null',
              SOURCE_CODE: 'NALD',
              BATCH_RUN_DATE: '12/02/2018 20:02:11',
              party: [
                {
                  ID: '1000000003',
                  APAR_TYPE: 'PER',
                  NAME: 'Doe',
                  SPOKEN_LANG: 'E',
                  WRITTEN_LANG: 'E',
                  LAST_CHANGED: '25/03/2025',
                  DISABLED: 'N',
                  FORENAME: 'John',
                  INITIALS: 'H',
                  SALUTATION: 'Mr',
                  REF: 'null',
                  DESCR: 'null',
                  LOCAL_NAME: 'null',
                  ASIC_ASID_DIVISION: 'null',
                  ASIC_CLASS: 'null',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:11'
                }
              ]
            },
            party: {
              ID: '1000000003',
              APAR_TYPE: 'PER',
              NAME: 'Doe',
              SPOKEN_LANG: 'E',
              WRITTEN_LANG: 'E',
              LAST_CHANGED: '25/03/2025',
              DISABLED: 'N',
              FORENAME: 'John',
              INITIALS: 'H',
              SALUTATION: 'Mr',
              REF: 'null',
              DESCR: 'null',
              LOCAL_NAME: 'null',
              ASIC_ASID_DIVISION: 'null',
              ASIC_CLASS: 'null',
              FGAC_REGION_CODE: '1',
              SOURCE_CODE: 'NALD',
              BATCH_RUN_DATE: '12/02/2018 20:02:11'
            },
            address: {
              ID: '1000000004',
              ADDR_LINE_1: 'Daisy cow farm',
              LAST_CHANGED: '01/01/2018 09:00:00',
              DISABLED: 'N',
              ADDR_LINE_2: 'Long road',
              ADDR_LINE_3: 'null',
              ADDR_LINE_4: 'null',
              TOWN: 'Daisybury',
              COUNTY: 'Testingshire',
              POSTCODE: 'TT1 1TT',
              COUNTRY: 'null',
              APCO_CODE: 'TEST',
              FGAC_REGION_CODE: '1',
              SOURCE_CODE: 'NALD',
              BATCH_RUN_DATE: '12/02/2018 20:02:11'
            },
            original_effective_date: '20180101',
            version_effective_date: '20180101',
            expiry_date: '22200101',
            purposes: [
              {
                ID: '1000000006',
                AABV_AABL_ID: '1000000001',
                AABV_ISSUE_NO: '100',
                AABV_INCR_NO: '0',
                APUR_APPR_CODE: 'A',
                APUR_APSE_CODE: 'AGR',
                APUR_APUS_CODE: '140',
                PERIOD_ST_DAY: '1',
                PERIOD_ST_MONTH: '3',
                PERIOD_END_DAY: '30',
                PERIOD_END_MONTH: '9',
                AMOM_CODE: 'PRT',
                ANNUAL_QTY: '105000',
                ANNUAL_QTY_USABILITY: 'L',
                DAILY_QTY: '15.2',
                DAILY_QTY_USABILITY: 'L',
                HOURLY_QTY: '3.5',
                HOURLY_QTY_USABILITY: 'L',
                INST_QTY: '0.15',
                INST_QTY_USABILITY: 'L',
                TIMELTD_START_DATE: 'null',
                LANDS: 'null',
                AREC_CODE: 'null',
                DISP_ORD: 'null',
                NOTES: 'Licence notes here, could include long NGR code SJ 1234 5678',
                FGAC_REGION_CODE: '1',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11',
                purpose: [
                  {
                    purpose_primary: {
                      CODE: 'A',
                      DESCR: 'Agriculture',
                      DISABLED: 'N',
                      DISP_ORD: 'null',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:05:59'
                    },
                    purpose_secondary: {
                      CODE: 'AGR',
                      DESCR: 'General Agriculture',
                      DISABLED: 'N',
                      DISP_ORD: 'null',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:05:59'
                    },
                    purpose_tertiary: {
                      CODE: '140',
                      DESCR: 'General Farming & Domestic',
                      DISABLED: 'N',
                      ALSF_CODE: 'M',
                      DISP_ORD: 'null',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:05:59'
                    }
                  }
                ],
                purposePoints: [
                  {
                    AABP_ID: '1000000006',
                    AAIP_ID: '1000000009',
                    AMOA_CODE: 'UNP',
                    NOTES: 'Notes here',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11',
                    means_of_abstraction: {
                      CODE: 'UNP',
                      DESCR: 'Unspecified Pump',
                      DISABLED: 'N',
                      DISP_ORD: 'null',
                      NOTES: 'null',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:02:11'
                    },
                    point_detail: {
                      ID: '1000000009',
                      NGR1_SHEET: 'SP',
                      NGR1_EAST: '123',
                      NGR1_NORTH: '456',
                      CART1_EAST: '400000',
                      CART1_NORTH: '240000',
                      NGR2_SHEET: 'null',
                      NGR2_EAST: 'null',
                      NGR2_NORTH: 'null',
                      CART2_EAST: 'null',
                      CART2_NORTH: 'null',
                      NGR3_SHEET: 'null',
                      NGR3_EAST: 'null',
                      NGR3_NORTH: 'null',
                      CART3_EAST: 'null',
                      CART3_NORTH: 'null',
                      NGR4_SHEET: 'null',
                      NGR4_EAST: 'null',
                      NGR4_NORTH: 'null',
                      CART4_EAST: 'null',
                      CART4_NORTH: 'null',
                      LOCAL_NAME: 'TEST BOREHOLE',
                      ASRC_CODE: 'GWSOS',
                      DISABLED: 'N',
                      AAPC_CODE: 'SP',
                      AAPT_APTP_CODE: 'G',
                      AAPT_APTS_CODE: 'BH',
                      LOCAL_NAME_WELSH: 'null',
                      ABAN_CODE: 'null',
                      LOCATION_TEXT: 'null',
                      AADD_ID: 'null',
                      DEPTH: 'null',
                      WRB_NO: 'null',
                      BGS_NO: 'null',
                      REG_WELL_INDEX_REF: 'null',
                      NOTES: 'null',
                      HYDRO_REF: 'null',
                      HYDRO_INTERCEPT_DIST: 'null',
                      HYDRO_GW_OFFSET_DIST: 'null',
                      FGAC_REGION_CODE: '1',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:02:11'
                    },
                    point_source: {
                      CODE: 'GWSOS',
                      NAME: 'GROUND WATER SOURCE OF SUPPLY',
                      LOCAL_NAME: 'GROUND WATER',
                      SOURCE_TYPE: 'GW',
                      NGR_SHEET: 'TL',
                      NGR_EAST: '12000',
                      NGR_NORTH: '80000',
                      CART_EAST: '470000',
                      CART_NORTH: '310000',
                      DISABLED: 'N',
                      AQUIFER_CLASS: 'null',
                      NOTES: 'null',
                      FGAC_REGION_CODE: '1',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:02:11'
                    }
                  }
                ],
                licenceAgreements: [
                  {
                    ID: '1000000008',
                    ALSA_CODE: 'S127',
                    EFF_ST_DATE: '01/01/2018',
                    AABP_ID: '1000000006',
                    AIPU_ID: 'null',
                    EFF_END_DATE: 'null',
                    TEXT: null,
                    SIGNED_DATE: 'null',
                    FILE_REF: 'null',
                    DISP_ORD: 'null',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  }
                ],
                licenceConditions: [
                  {
                    ID: '1000000007',
                    ACIN_CODE: 'CES',
                    ACIN_SUBCODE: 'FLOW',
                    AABP_ID: '1000000006',
                    AIPU_ID: 'null',
                    PARAM1: 'AUTHOR',
                    PARAM2: '17.5',
                    DISP_ORD: 'null',
                    TEXT: 'Some additional text here',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11',
                    condition_type: {
                      CODE: 'CES',
                      SUBCODE: 'FLOW',
                      DESCR: 'Cessation Condition',
                      AFFECTS_ABS: 'Y',
                      AFFECTS_IMP: 'Y',
                      DISABLED: 'N',
                      DISP_ORD: 'null',
                      SOURCE_CODE: 'NALD',
                      BATCH_RUN_DATE: '12/02/2018 20:02:11'
                    }
                  }
                ]
              }
            ],
            formats: [
              {
                ID: '1000000010',
                ARVN_AABL_ID: '1000000001',
                ARVN_VERS_NO: '100',
                RETURN_FORM_TYPE: 'M',
                ARTC_CODE: 'M',
                ARTC_RET_FREQ_CODE: 'A',
                FORMS_REQ_ALL_YEAR: 'Y',
                FORM_PRODN_MONTH: '80',
                NO_OF_DAYS_GRACE: '14',
                TPT_FLAG: 'N',
                ABS_PERIOD_START_DAY: '1',
                ABS_PERIOD_START_MONTH: '1',
                ABS_PERIOD_END_DAY: '31',
                ABS_PERIOD_END_MONTH: '12',
                TIMELTD_ST_DATE: 'null',
                TIMELTD_END_DATE: 'null',
                DISP_ORD: 'null',
                SITE_DESCR: 'The well on the hill under the tree',
                DESCR: '1000 CMA',
                ANNUAL_QTY: 'null',
                ANNUAL_QTY_USABILITY: 'null',
                CC_IND: 'null',
                FGAC_REGION_CODE: '1',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11',
                points: [
                  {
                    ID: '1000000009',
                    NGR1_SHEET: 'SP',
                    NGR1_EAST: '123',
                    NGR1_NORTH: '456',
                    CART1_EAST: '400000',
                    CART1_NORTH: '240000',
                    NGR2_SHEET: 'null',
                    NGR2_EAST: 'null',
                    NGR2_NORTH: 'null',
                    CART2_EAST: 'null',
                    CART2_NORTH: 'null',
                    NGR3_SHEET: 'null',
                    NGR3_EAST: 'null',
                    NGR3_NORTH: 'null',
                    CART3_EAST: 'null',
                    CART3_NORTH: 'null',
                    NGR4_SHEET: 'null',
                    NGR4_EAST: 'null',
                    NGR4_NORTH: 'null',
                    CART4_EAST: 'null',
                    CART4_NORTH: 'null',
                    LOCAL_NAME: 'TEST BOREHOLE',
                    ASRC_CODE: 'GWSOS',
                    DISABLED: 'N',
                    AAPC_CODE: 'SP',
                    AAPT_APTP_CODE: 'G',
                    AAPT_APTS_CODE: 'BH',
                    LOCAL_NAME_WELSH: 'null',
                    ABAN_CODE: 'null',
                    LOCATION_TEXT: 'null',
                    AADD_ID: 'null',
                    DEPTH: 'null',
                    WRB_NO: 'null',
                    BGS_NO: 'null',
                    REG_WELL_INDEX_REF: 'null',
                    NOTES: 'null',
                    HYDRO_REF: 'null',
                    HYDRO_INTERCEPT_DIST: 'null',
                    HYDRO_GW_OFFSET_DIST: 'null',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  }
                ],
                purposes: [
                  {
                    ARTY_ID: '1000000010',
                    APUR_APPR_CODE: 'A',
                    APUR_APSE_CODE: 'AGR',
                    APUR_APUS_CODE: '400',
                    PURP_ALIAS: 'Spray irrigation - direct',
                    PURP_ALIAS_WELSH: 'null',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11',
                    primary_purpose: 'Agriculture',
                    secondary_purpose: 'General Agriculture',
                    tertiary_purpose: null
                  }
                ]
              }
            ]
          },
          cams: [
            {
              CODE: '100',
              NAME: 'PARISH OF TESTINGSHIRE (ESSEX)',
              NGR_SHEET: 'TM',
              NGR_EAST: '18000',
              NGR_NORTH: '15000',
              CART_EAST: '550000',
              CART_NORTH: '290000',
              ARUT_CODE: 'OTHER',
              DISABLED: 'N',
              AREP_CODE: '04',
              ACON_AADD_ID: 'null',
              ACON_APAR_ID: 'null',
              NOTES: 'null',
              FGAC_REGION_CODE: '1',
              SOURCE_CODE: 'NALD',
              BATCH_RUN_DATE: '12/02/2018 20:02:11'
            }
          ],
          roles: [
            {
              role_detail: {
                ID: '1000000005',
                ALRT_CODE: 'LC',
                ACON_APAR_ID: '1000000003',
                ACON_AADD_ID: '1000000004',
                EFF_ST_DATE: '25/03/2025',
                AABL_ID: '1000000001',
                AIMP_ID: 'null',
                EFF_END_DATE: '25/03/2026',
                FGAC_REGION_CODE: '1',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11'
              },
              role_type: {
                CODE: 'LC',
                DESCR: 'Licence contact',
                AFFECTS_ABS: 'Y',
                AFFECTS_IMP: 'Y',
                CUST_AGENCY: 'CUST',
                USED_BY_SYS: 'N',
                DISABLED: 'N',
                DISP_ORD: 'null',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11'
              },
              role_party: {
                ID: '1000000003',
                APAR_TYPE: 'PER',
                NAME: 'Doe',
                SPOKEN_LANG: 'E',
                WRITTEN_LANG: 'E',
                LAST_CHANGED: '25/03/2025',
                DISABLED: 'N',
                FORENAME: 'John',
                INITIALS: 'H',
                SALUTATION: 'Mr',
                REF: 'null',
                DESCR: 'null',
                LOCAL_NAME: 'null',
                ASIC_ASID_DIVISION: 'null',
                ASIC_CLASS: 'null',
                FGAC_REGION_CODE: '1',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11'
              },
              role_address: {
                ID: '1000000004',
                ADDR_LINE_1: 'Daisy cow farm',
                LAST_CHANGED: '01/01/2018 09:00:00',
                DISABLED: 'N',
                ADDR_LINE_2: 'Long road',
                ADDR_LINE_3: 'null',
                ADDR_LINE_4: 'null',
                TOWN: 'Daisybury',
                COUNTY: 'Testingshire',
                POSTCODE: 'TT1 1TT',
                COUNTRY: 'null',
                APCO_CODE: 'TEST',
                FGAC_REGION_CODE: '1',
                SOURCE_CODE: 'NALD',
                BATCH_RUN_DATE: '12/02/2018 20:02:11'
              },
              array: [
                {
                  ACON_APAR_ID: '1000000003',
                  ACON_AADD_ID: '1000000004',
                  ACNT_CODE: 'WP',
                  CONT_NO: '01234 567890',
                  DISP_ORD: 'null',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:32',
                  CODE: 'WP',
                  DESCR: 'Work Phone',
                  DISABLED: 'N'
                }
              ]
            }
          ],
          purposes: [
            {
              ID: '1000000006',
              AABV_AABL_ID: '1000000001',
              AABV_ISSUE_NO: '100',
              AABV_INCR_NO: '0',
              APUR_APPR_CODE: 'A',
              APUR_APSE_CODE: 'AGR',
              APUR_APUS_CODE: '140',
              PERIOD_ST_DAY: '1',
              PERIOD_ST_MONTH: '3',
              PERIOD_END_DAY: '30',
              PERIOD_END_MONTH: '9',
              AMOM_CODE: 'PRT',
              ANNUAL_QTY: '105000',
              ANNUAL_QTY_USABILITY: 'L',
              DAILY_QTY: '15.2',
              DAILY_QTY_USABILITY: 'L',
              HOURLY_QTY: '3.5',
              HOURLY_QTY_USABILITY: 'L',
              INST_QTY: '0.15',
              INST_QTY_USABILITY: 'L',
              TIMELTD_START_DATE: 'null',
              LANDS: 'null',
              AREC_CODE: 'null',
              DISP_ORD: 'null',
              NOTES: 'Licence notes here, could include long NGR code SJ 1234 5678',
              FGAC_REGION_CODE: '1',
              SOURCE_CODE: 'NALD',
              BATCH_RUN_DATE: '12/02/2018 20:02:11',
              purpose: [
                {
                  purpose_primary: {
                    CODE: 'A',
                    DESCR: 'Agriculture',
                    DISABLED: 'N',
                    DISP_ORD: 'null',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:05:59'
                  },
                  purpose_secondary: {
                    CODE: 'AGR',
                    DESCR: 'General Agriculture',
                    DISABLED: 'N',
                    DISP_ORD: 'null',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:05:59'
                  },
                  purpose_tertiary: {
                    CODE: '140',
                    DESCR: 'General Farming & Domestic',
                    DISABLED: 'N',
                    ALSF_CODE: 'M',
                    DISP_ORD: 'null',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:05:59'
                  }
                }
              ],
              purposePoints: [
                {
                  AABP_ID: '1000000006',
                  AAIP_ID: '1000000009',
                  AMOA_CODE: 'UNP',
                  NOTES: 'Notes here',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:11',
                  means_of_abstraction: {
                    CODE: 'UNP',
                    DESCR: 'Unspecified Pump',
                    DISABLED: 'N',
                    DISP_ORD: 'null',
                    NOTES: 'null',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  },
                  point_detail: {
                    ID: '1000000009',
                    NGR1_SHEET: 'SP',
                    NGR1_EAST: '123',
                    NGR1_NORTH: '456',
                    CART1_EAST: '400000',
                    CART1_NORTH: '240000',
                    NGR2_SHEET: 'null',
                    NGR2_EAST: 'null',
                    NGR2_NORTH: 'null',
                    CART2_EAST: 'null',
                    CART2_NORTH: 'null',
                    NGR3_SHEET: 'null',
                    NGR3_EAST: 'null',
                    NGR3_NORTH: 'null',
                    CART3_EAST: 'null',
                    CART3_NORTH: 'null',
                    NGR4_SHEET: 'null',
                    NGR4_EAST: 'null',
                    NGR4_NORTH: 'null',
                    CART4_EAST: 'null',
                    CART4_NORTH: 'null',
                    LOCAL_NAME: 'TEST BOREHOLE',
                    ASRC_CODE: 'GWSOS',
                    DISABLED: 'N',
                    AAPC_CODE: 'SP',
                    AAPT_APTP_CODE: 'G',
                    AAPT_APTS_CODE: 'BH',
                    LOCAL_NAME_WELSH: 'null',
                    ABAN_CODE: 'null',
                    LOCATION_TEXT: 'null',
                    AADD_ID: 'null',
                    DEPTH: 'null',
                    WRB_NO: 'null',
                    BGS_NO: 'null',
                    REG_WELL_INDEX_REF: 'null',
                    NOTES: 'null',
                    HYDRO_REF: 'null',
                    HYDRO_INTERCEPT_DIST: 'null',
                    HYDRO_GW_OFFSET_DIST: 'null',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  },
                  point_source: {
                    CODE: 'GWSOS',
                    NAME: 'GROUND WATER SOURCE OF SUPPLY',
                    LOCAL_NAME: 'GROUND WATER',
                    SOURCE_TYPE: 'GW',
                    NGR_SHEET: 'TL',
                    NGR_EAST: '12000',
                    NGR_NORTH: '80000',
                    CART_EAST: '470000',
                    CART_NORTH: '310000',
                    DISABLED: 'N',
                    AQUIFER_CLASS: 'null',
                    NOTES: 'null',
                    FGAC_REGION_CODE: '1',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  }
                }
              ],
              licenceAgreements: [
                {
                  ID: '1000000008',
                  ALSA_CODE: 'S127',
                  EFF_ST_DATE: '01/01/2018',
                  AABP_ID: '1000000006',
                  AIPU_ID: 'null',
                  EFF_END_DATE: 'null',
                  TEXT: null,
                  SIGNED_DATE: 'null',
                  FILE_REF: 'null',
                  DISP_ORD: 'null',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:11'
                }
              ],
              licenceConditions: [
                {
                  ID: '1000000007',
                  ACIN_CODE: 'CES',
                  ACIN_SUBCODE: 'FLOW',
                  AABP_ID: '1000000006',
                  AIPU_ID: 'null',
                  PARAM1: 'AUTHOR',
                  PARAM2: '17.5',
                  DISP_ORD: 'null',
                  TEXT: 'Some additional text here',
                  FGAC_REGION_CODE: '1',
                  SOURCE_CODE: 'NALD',
                  BATCH_RUN_DATE: '12/02/2018 20:02:11',
                  condition_type: {
                    CODE: 'CES',
                    SUBCODE: 'FLOW',
                    DESCR: 'Cessation Condition',
                    AFFECTS_ABS: 'Y',
                    AFFECTS_IMP: 'Y',
                    DISABLED: 'N',
                    DISP_ORD: 'null',
                    SOURCE_CODE: 'NALD',
                    BATCH_RUN_DATE: '12/02/2018 20:02:11'
                  }
                }
              ]
            }
          ]
        }
      })
    })
  })
})
