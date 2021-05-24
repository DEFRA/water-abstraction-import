
const createLicence = overrides => Object.assign({}, {
  ID: '123',
  LIC_NO: '01/123',
  FGAC_REGION_CODE: '1',
  ORIG_EFF_DATE: '01/04/2016',
  EXPIRY_DATE: 'null',
  REV_DATE: 'null',
  LAPSED_DATE: 'null',
  AREP_EIUC_CODE: 'SOOTH'
}, overrides);

const createVersion = (licence, overrides) => Object.assign({}, {
  AABL_ID: licence.ID,
  FGAC_REGION_CODE: licence.FGAC_REGION_CODE,
  STATUS: 'CURR',
  EFF_ST_DATE: licence.ORIG_EFF_DATE,
  EFF_END_DATE: 'null',
  ACON_APAR_ID: '1000',
  ACON_AADD_ID: '1000',
  ISSUE_NO: '100',
  INCR_NO: '1'
}, overrides);

const createParty = overrides => Object.assign({}, {
  ID: '1000',
  APAR_TYPE: 'ORG',
  FGAC_REGION_CODE: '1',
  NAME: 'BIG CO LTD',
  FORENAME: 'null',
  INITIALS: 'null',
  SALUTATION: 'null'
}, overrides);

const createCompany = overrides => Object.assign({}, createParty({ ID: '1000', APAR_TYPE: 'ORG' }), overrides);
const createPerson = overrides => Object.assign({}, createParty({
  ID: '1001',
  APAR_TYPE: 'PER',
  SALUTATION: 'SIR',
  INITIALS: 'J',
  FORENAME: 'JOHN',
  NAME: 'DOE'
}), overrides);

const createAddress = overrides => Object.assign({}, {
  ID: '1000',
  FGAC_REGION_CODE: '1',
  ADDR_LINE1: 'BIG MANOR FARM',
  ADDR_LINE2: 'BUTTERCUP LANE',
  ADDR_LINE3: 'DAISY MEADOW',
  ADDR_LINE4: 'null',
  TOWN: 'TESTINGTON',
  COUNTY: 'TESTINGSHIRE',
  POSTCODE: 'TT1 1TT',
  COUNTRY: 'ENGLAND'
}, overrides);

const createAgreement = overrides => Object.assign({}, {
  AFSA_CODE: 'S130U',
  EFF_ST_DATE: '14/02/2017',
  EFF_END_DATE: '14/02/2018'
}, overrides);

const createInvoiceAccount = overrides => Object.assign({}, {
  FGAC_REGION_CODE: '1',
  IAS_CUST_REF: 'X1234',
  ACON_APAR_ID: '1000',
  ACON_AADD_ID: '1000',
  IAS_XFER_DATE: '05/04/2016 11:24:02',
  licence_holder_party_id: '1000',
  licence_holder_party_name: 'Big Co Ltd.',
  invoice_account_party_name: 'Big Co Ltd.'
}, overrides);

const createChargeVersion = (licence, overrides) => Object.assign({}, {
  AABL_ID: licence.ID,
  FGAC_REGION_CODE: licence.FGAC_REGION_CODE,
  VERS_NO: '1',
  EFF_ST_DATE: '25/12/2015',
  STATUS: 'CURRENT',
  IAS_CUST_REF: 'X1234',
  EFF_END_DATE: 'null',
  ACON_APAR_ID: '1000',
  ACON_AADD_ID: '1000'
}, overrides);

const createPurpose = (licence, overrides) => Object.assign({}, {
  ID: '674',
  AABV_AABL_ID: licence.ID,
  FGAC_REGION_CODE: licence.FGAC_REGION_CODE,
  AABV_ISSUE_NO: '100',
  AABV_INCR_NO: '1',
  APUR_APPR_CODE: 'P',
  APUR_APSE_CODE: 'ELC',
  APUR_APUS_CODE: '80',
  PERIOD_ST_DAY: '1',
  PERIOD_ST_MONTH: '1',
  PERIOD_END_DAY: '31',
  PERIOD_END_MONTH: '12',
  ANNUAL_QTY: '10000',
  DAILY_QTY: '365',
  HOURLY_QTY: '24',
  TIMELTD_ST_DATE: 'null',
  TIMELTD_END_DATE: 'null',
  NOTES: 'null'
}, overrides);

const createCondition = (purpose, overrides) => Object.assign({}, {
  AABP_ID: purpose.ID,
  ACIN_CODE: 'AAG',
  ACIN_SUBCODE: 'LLL',
  PARAM1: 'null',
  PARAM2: 'null',
  TEXT: 'null',
  FGAC_REGION_CODE: purpose.FGAC_REGION_CODE
}, overrides);

exports.createAddress = createAddress;
exports.createAgreement = createAgreement;
exports.createChargeVersion = createChargeVersion;
exports.createCompany = createCompany;
exports.createInvoiceAccount = createInvoiceAccount;
exports.createLicence = createLicence;
exports.createParty = createParty;
exports.createPerson = createPerson;
exports.createPurpose = createPurpose;
exports.createCondition = createCondition;
exports.createVersion = createVersion;
