const IMPORT_COMPANIES_JOB = 'import.companies';
const IMPORT_COMPANY_JOB = 'import.company';
const IMPORT_LICENCES_JOB = 'import.licences';
const IMPORT_LICENCE_JOB = 'import.licence';

/**
 * Formats arguments to publish a PG boss event to import all companies
 * @return {Object}
 */
const importCompanies = () => ({
  name: IMPORT_COMPANIES_JOB,
  options: {
    singletonKey: `${IMPORT_COMPANIES_JOB}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
});

/**
 * Formats arguments to publish a PG boss event to import company
 * @param {Number} regionCode - NALD region code
 * @param {Number} partyId - NALD party ID
 * @return {Object}
 */
const importCompany = (regionCode, partyId) => ({
  name: IMPORT_COMPANY_JOB,
  data: {
    regionCode,
    partyId
  },
  options: {
    singletonKey: `${IMPORT_COMPANY_JOB}.${regionCode}.${partyId}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
});

/**
 * Formats arguments to publish a PG boss event to start company import
 * @return {Object}
 */
const importLicences = () => ({
  name: IMPORT_LICENCES_JOB,
  options: {
    singletonKey: `${IMPORT_LICENCES_JOB}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
});

/**
 * Formats arguments to publish a PG boss event to import company
 * @param {Number} regionCode - NALD region code
 * @param {Number} partyId - NALD party ID
 * @return {Object}
 */
const importLicence = licenceNumber => ({
  name: IMPORT_LICENCE_JOB,
  data: {
    licenceNumber
  },
  options: {
    singletonKey: `${IMPORT_LICENCE_JOB}.${licenceNumber}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
});

exports.IMPORT_COMPANIES_JOB = IMPORT_COMPANIES_JOB;
exports.IMPORT_COMPANY_JOB = IMPORT_COMPANY_JOB;
exports.IMPORT_LICENCES_JOB = IMPORT_LICENCES_JOB;
exports.IMPORT_LICENCE_JOB = IMPORT_LICENCE_JOB;

exports.importCompanies = importCompanies;
exports.importCompany = importCompany;
exports.importLicences = importLicences;
exports.importLicence = importLicence;
