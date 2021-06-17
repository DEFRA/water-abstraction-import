'use strict';

const date = require('./date');
const roles = require('./roles');

const mapLicenceHolderRoles = (document, licenceVersions, context) => licenceVersions
  .filter(licenceVersion => isLicenceVersionForImport(licenceVersion, licenceVersions))
  .map(licenceVersion => mapLicenceHolderRole(document, licenceVersion, context));

const getVersion = licenceVersion => ({
  issue: parseInt(licenceVersion.ISSUE_NO),
  increment: parseInt(licenceVersion.INCR_NO)
});

const compareLicenceVersions = (licenceVersionA, licenceVersionB) => {
  const versionA = getVersion(licenceVersionA);
  const versionB = getVersion(licenceVersionB);
  if (versionA.issue === versionB.issue) {
    if (versionA.increment === versionB.increment) {
      return 0;
    }
    return versionA.increment > versionB.increment ? -1 : +1;
  }
  return versionA.issue > versionB.issue ? -1 : +1;
};

const isLicenceVersionForImport = (licenceVersion, licenceVersions) => {
  if (licenceVersion.status === 'DRAFT') {
    return false;
  }

  const subsequentLicenceVersions = licenceVersions.filter(
    comparisonLicenceVersion => compareLicenceVersions(licenceVersion, comparisonLicenceVersion) === -1
  );

  const replacementLicenceVersion = subsequentLicenceVersions.find(
    comparisonLicenceVersion => comparisonLicenceVersion.EFF_ST_DATE === licenceVersion.EFF_ST_DATE
  );

  return !replacementLicenceVersion;
};

/**
 * Creates an initial document role for the licence holder
 * excluding party / address / company - this will be added
 * after the roles are merged by date range
 * @param {Object} document
 * @param {Object} licenceVersion
 * @return {Object} document role
 */
const mapLicenceHolderRole = (document, licenceVersion, context) => ({
  role: 'licenceHolder',
  startDate: date.getMaxDate([
    document.startDate,
    date.mapNaldDate(licenceVersion.EFF_ST_DATE)
  ]),
  endDate: date.getMinDate([
    document.endDate,
    date.mapNaldDate(licenceVersion.EFF_END_DATE)
  ]),
  ...context.parties[licenceVersion.FGAC_REGION_CODE][licenceVersion.ACON_APAR_ID],
  address: context.addresses[licenceVersion.FGAC_REGION_CODE][licenceVersion.ACON_AADD_ID]
});

const mapLicenceRole = (row, context) => ({
  role: roles.naldRoles.get(row.ALRT_CODE),
  startDate: date.mapNaldDate(row.EFF_ST_DATE),
  endDate: date.mapNaldDate(row.EFF_END_DATE),
  invoiceAccount: null,
  contact: null,
  ...context.parties[row.FGAC_REGION_CODE][row.ACON_APAR_ID],
  address: context.addresses[row.FGAC_REGION_CODE][row.ACON_AADD_ID]
});

/**
 * Whether this role should be imported
 * @param {Object} role - nald licence role row data
 * @return {Boolean}
 */
const isRoleForImport = role => roles.naldRoles.get(role.ALRT_CODE) === roles.ROLE_RETURNS_TO;

/**
 * Maps NALD roles (returns to contact)
 * @param {Object} document
 * @param {Array} roles - array of roles loaded from NALD
 */
const mapLicenceRoles = (document, roles, context) => roles
  .filter(isRoleForImport)
  .map(role => mapLicenceRole(role, context));

exports.mapLicenceHolderRoles = mapLicenceHolderRoles;
exports.mapLicenceRoles = mapLicenceRoles;
