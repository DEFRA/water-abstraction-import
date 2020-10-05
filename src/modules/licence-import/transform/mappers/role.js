const { last, isEqual, get } = require('lodash');
const helpers = require('@envage/water-abstraction-helpers');

const invoiceAccount = require('./invoice-account');
const date = require('./date');
const roles = require('./roles');

/**
 * Creates an initial document role for the licence holder
 * excluding party / address / company - this will be added
 * after the roles are merged by date range
 * @param {Object} document
 * @param {Object} licenceVersion
 * @return {Object} document role
 */
const createLicenceHolderRole = (document, licenceVersion, context) => ({
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

const getRoleForComparison = role => {
  const companyId = get(role, 'company.externalId');
  const addressId = get(role, 'address.externalId');
  const contactId = get(role, 'contact.externalId');
  return { companyId, addressId, contactId };
};

/**
 * Determines whether the specified role should be appended
 * to the array or merged with the last element
 * @param {Array} acc
 * @param {Object} role
 * @return {Boolean}
 */
const roleIsMergeable = (acc, role) => {
  if (acc.length === 0) {
    return false;
  }
  const lastRole = last(acc);
  return isEqual(getRoleForComparison(role), getRoleForComparison(lastRole));
};

/**
 * Merges roles if adjacent elements in the array are
 * similar except for their date range
 * @param {Array} roles
 * @return {Array} new roles array
 */
const mergeRoles = roles => roles.reduce((acc, role) => {
  if (roleIsMergeable(acc, role)) {
    acc[acc.length - 1].endDate = role.endDate;
  } else {
    acc.push(role);
  }
  return acc;
}, []);

const mapLicenceHolderRoles = (document, context) => {
  // Create initial roles list
  const roles = document._nald.map(licenceVersion => createLicenceHolderRole(document, licenceVersion, context));

  // Merge roles on date range
  return mergeRoles(roles);
};

/**
 * Creates an invoice account role for a document
 * @param {Object} chargeVersion
 * @param {Object} context - contains party and address data
 * @return {Object} document role
 */
const createInvoiceAccountRole = chargeVersion => ({
  role: 'billing',
  startDate: date.mapNaldDate(chargeVersion.EFF_ST_DATE),
  endDate: date.mapNaldDate(chargeVersion.EFF_END_DATE),
  invoiceAccount: invoiceAccount.mapInvoiceAccount(chargeVersion),
  company: null,
  contact: null,
  address: null
});

const mergeAndSplitOnDocumentDateRange = (doc, arr) => {
  const merged = helpers.charging.mergeHistory(arr);

  // Split history against document dates
  const split = helpers.charging.dateRangeSplitter(doc, merged, 'data');

  // Remove any items in array where the data is null following the date split
  const filtered = split.filter(doc => doc.data !== null);

  // Map back to object without the document
  return filtered.map(doc => ({
    ...doc.data,
    startDate: doc.effectiveStartDate,
    endDate: doc.effectiveEndDate
  }));
};

/**
 * Maps document and charge versions to an array of billing roles
 * for a document
 * @param {Object} document - document
 * @param {Array} chargeVersions - array of charge versions
 * @param {Object} context - company, contact and address data
 */
const mapBillingRoles = (document, chargeVersions, context) => {
  // Create roles
  const roles = chargeVersions.map(chargeVersion =>
    createInvoiceAccountRole(chargeVersion, context)
  );

  return mergeAndSplitOnDocumentDateRange(document, roles);
};

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
const mapLicenceRoles = (document, roles, context) => {
  // Filter returns-to roles only, and map to licence role
  const mappedRoles = roles
    .filter(isRoleForImport)
    .map(role => mapLicenceRole(role, context));

  return mergeAndSplitOnDocumentDateRange(document, mappedRoles);
};

exports.mapLicenceHolderRoles = mapLicenceHolderRoles;
exports.mapBillingRoles = mapBillingRoles;
exports.mapLicenceRoles = mapLicenceRoles;
