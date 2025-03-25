'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, before, after } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const db = require('../../../src/lib/connectors/db.js')
const NaldDataGenerator = require('../../../scripts/licence-creator/index.js')
const processHelper = require('@envage/water-abstraction-helpers').process

// Things we need to stub
const S3 = require('../../../src/modules/extract-nald-data/lib/s3.js')
const Zip = require('../../../src/modules/extract-nald-data/lib/zip.js')

// Thing under test
const ExtractNaldDataProcess = require('../../../src/modules/extract-nald-data/process.js')

// NOTE: This was based on an existing test left by the previous team. It used a separate method called `copyTestFiles`
// that was a bit like the main method, and got some dummy NALD data from files into the schema. The unit tests
// then, in a very round about way asserted the data was imported as expected.
//
// Using stubbing, we now call the actual method rather than a stand in, but we do stub the download and extract steps
// as admittedly, they are messy to test.
//
// But the rest of the process is tested 'as-is', and we've copied the previous assertions on the imported test data.
experiment('modules/extract-nald-data/process.js', () => {
  before(async () => {
    // For the purposes of unit testing, we assume that if the NALD file exists in the S3 bucket that we can download it
    Sinon.stub(S3, 'download').resolves()

    // We could use the 'licence-creator' the previous team wrote to generate some files, then place them in an
    // encrypted ZIP file, and then store that as part of the source code to support this stage of the unit test. But
    // we're happy to also assume that works fine.
    //
    // So, instead, we stub that call in the process and replace it with a call to generate the files and then copy
    // them to the same place `Zip.extract()` would.
    Sinon.stub(Zip, 'extract').callsFake(async () => {
      await NaldDataGenerator()
      await processHelper.execCommand("cp ./test/dummy-csv/* './temp/NALD'")
    })
  })

  after(() => {
    Sinon.restore()
  })

  experiment('when called', () => {
    // NOTE: We break our unit test pattern or Arrange-Act-Assert just this once because of the overhead involved.
    // Normally we would call the thing under test (Act) as the first line of the test and leave `before()` to handle
    // the arrangement.
    before(async () => {
      await ExtractNaldDataProcess.go()
    })

    test('extracts the NALD CSV data into the NALD import DB schema', async () => {
      const results = await db.query(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'import' ORDER BY table_name;
      `)

      expect(results).to.have.length(26)

      expect(results[0].table_name).to.equal('NALD_ABS_LICENCES')
      expect(results[25].table_name).to.equal('NALD_WA_LIC_TYPES')
    })

    test('extracts the NALD licence data as expected', async () => {
      let results = await db.query('SELECT * FROM "import"."NALD_ABS_LICENCES";')

      expect(results[0]).to.equal({
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
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_ABS_LIC_VERSIONS";')

      expect(results[0]).to.equal({
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
        FGAC_REGION_CODE: '1'
      })

      results = await db.query('SELECT * FROM "import"."NALD_ABS_LIC_PURPOSES";')

      expect(results[0]).to.equal({
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
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_ABS_PURP_POINTS";')

      expect(results[0]).to.equal({
        AABP_ID: '1000000006',
        AAIP_ID: '1000000009',
        AMOA_CODE: 'UNP',
        NOTES: 'Notes here',
        FGAC_REGION_CODE: '1',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_LIC_AGRMNTS";')

      expect(results[0]).to.equal({
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
      })

      results = await db.query('SELECT * FROM "import"."NALD_LIC_CONDITIONS";')

      expect(results[0]).to.equal({
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
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_LIC_ROLES";')

      expect(results[0]).to.equal({
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
      })
    })

    test('extracts the NALD party data as expected', async () => {
      const results = await db.query('SELECT * FROM "import"."NALD_PARTIES";')

      expect(results[0]).to.equal({
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
      })
    })

    test('extracts the NALD address data as expected', async () => {
      const results = await db.query('SELECT * FROM "import"."NALD_ADDRESSES";')

      expect(results[0]).to.equal({
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
      })
    })

    test('extracts the NALD point data as expected', async () => {
      const results = await db.query('SELECT * FROM "import"."NALD_POINTS";')

      expect(results[0]).to.equal({
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
      })
    })

    test('extracts the NALD purpose data as expected', async () => {
      let results = await db.query('SELECT * FROM "import"."NALD_PURP_USES";')

      expect(results[0]).to.equal({
        CODE: '140',
        DESCR: 'General Farming & Domestic',
        DISABLED: 'N',
        ALSF_CODE: 'M',
        DISP_ORD: 'null',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:05:59'
      })

      results = await db.query('SELECT * FROM "import"."NALD_PURP_PRIMS";')

      expect(results[0]).to.equal({
        CODE: 'A',
        DESCR: 'Agriculture',
        DISABLED: 'N',
        DISP_ORD: 'null',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:05:59'
      })

      results = await db.query('SELECT * FROM "import"."NALD_PURP_SECS";')

      expect(results[0]).to.equal({
        CODE: 'AGR',
        DESCR: 'General Agriculture',
        DISABLED: 'N',
        DISP_ORD: 'null',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:05:59'
      })
    })

    test('extracts the NALD return version data as expected', async () => {
      let results = await db.query('SELECT * FROM "import"."NALD_RET_VERSIONS";')

      expect(results[0]).to.equal({
        AABL_ID: '1000000001',
        VERS_NO: '100',
        EFF_ST_DATE: '01/01/2018',
        STATUS: 'CURR',
        FORM_LOGS_REQD: 'Y',
        EFF_END_DATE: 'null',
        FGAC_REGION_CODE: '1',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_RET_FORMATS";')

      expect(results[0]).to.equal({
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
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_RET_FMT_POINTS";')

      expect(results[0]).to.equal({
        ARTY_ID: '1000000010',
        AAIP_ID: '1000000009',
        FGAC_REGION_CODE: '1',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })

      results = await db.query('SELECT * FROM "import"."NALD_RET_FMT_PURPOSES";')

      expect(results[0]).to.equal({
        ARTY_ID: '1000000010',
        APUR_APPR_CODE: 'A',
        APUR_APSE_CODE: 'AGR',
        APUR_APUS_CODE: '400',
        PURP_ALIAS: 'Spray irrigation - direct',
        PURP_ALIAS_WELSH: 'null',
        FGAC_REGION_CODE: '1',
        SOURCE_CODE: 'NALD',
        BATCH_RUN_DATE: '12/02/2018 20:02:11'
      })
    })
  })
})
