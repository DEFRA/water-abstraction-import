const IMPORT_COMPANY_JOB = 'import.company';
const IMPORT_LICENCES_JOB = 'import.licences';
const IMPORT_LICENCE_JOB = 'import.licence';

/**
 * Formats arguments to publish a PG boss event to import company
 * @param {Number} regionCode - NALD region code
 * @param {Number} partyId - NALD party ID
 * @return {Array}
 */
const importCompany = (regionCode, partyId) => ([
  IMPORT_COMPANY_JOB,
  {
    regionCode,
    partyId
  },
  {
    singletonKey: `${IMPORT_COMPANY_JOB}.${regionCode}.${partyId}`,
    singletonHours: 1,
    expireIn: '4 hour',
    priority: 1
  }
]);

/**
 * Formats arguments to publish a PG boss event to start company import
 * @return {Array}
 */
const importLicences = () => ([
  IMPORT_LICENCES_JOB,
  {
  },
  {
    singletonKey: `${IMPORT_LICENCES_JOB}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
]);

/**
 * Formats arguments to publish a PG boss event to import company
 * @param {Number} regionCode - NALD region code
 * @param {Number} partyId - NALD party ID
 * @return {Array}
 */
const importLicence = licenceNumber => ([
  IMPORT_LICENCE_JOB,
  {
    licenceNumber
  },
  {
    singletonKey: `${IMPORT_LICENCE_JOB}.${licenceNumber}`,
    singletonHours: 1,
    expireIn: '4 hour',
    priority: 0
  }
]);

exports.IMPORT_COMPANY_JOB = IMPORT_COMPANY_JOB;
exports.IMPORT_LICENCES_JOB = IMPORT_LICENCES_JOB;
exports.IMPORT_LICENCE_JOB = IMPORT_LICENCE_JOB;

exports.importCompany = importCompany;
exports.importLicences = importLicences;
exports.importLicence = importLicence;
