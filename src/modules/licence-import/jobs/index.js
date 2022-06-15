'use strict';

const IMPORT_COMPANIES_JOB = 'import.companies';
const IMPORT_COMPANY_JOB = 'import.company';
const IMPORT_LICENCES_JOB = 'import.licences';
const IMPORT_LICENCE_JOB = 'import.licence';
const DELETE_DOCUMENTS_JOB = 'import.delete-documents';
const IMPORT_PURPOSE_CONDITION_TYPES_JOB = 'import.purpose-condition-types';

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
 * Formats arguments to publish a PG boss event to import licence
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
    singletonKey: `${IMPORT_LICENCE_JOB}.${licenceNumber}`
  }
});

const deleteDocuments = () => ({
  name: DELETE_DOCUMENTS_JOB
});

const importPurposeConditionTypes = () => ({
  name: IMPORT_PURPOSE_CONDITION_TYPES_JOB
});

module.exports = {
  IMPORT_PURPOSE_CONDITION_TYPES_JOB,
  IMPORT_COMPANIES_JOB,
  IMPORT_COMPANY_JOB,
  IMPORT_LICENCES_JOB,
  IMPORT_LICENCE_JOB,
  DELETE_DOCUMENTS_JOB,
  importPurposeConditionTypes,
  importCompanies,
  importCompany,
  importLicences,
  importLicence,
  deleteDocuments
};
