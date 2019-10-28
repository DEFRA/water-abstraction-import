
const createLicence = overrides => Object.assign({}, {
  ID: '123',
  LIC_NO: '01/123',
  FGAC_REGION_CODE: '1',
  ORIG_EFF_DATE: '01/04/2016',
  EXPIRY_DATE: 'null',
  REV_DATE: 'null',
  LAPSED_DATE: 'null'
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

exports.createLicence = createLicence;
exports.createVersion = createVersion;
exports.createCompany = createCompany;
exports.createPerson = createPerson;
exports.createAddress = createAddress;
