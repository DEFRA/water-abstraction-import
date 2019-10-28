const { last, omit, isEqual, get } = require('lodash');
const helpers = require('@envage/water-abstraction-helpers');

const invoiceAccount = require('./invoice-account');

const date = require('./date');

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
const createInvoiceAccountRole = (chargeVersion, context) => ({
  role: 'billing',
  startDate: date.mapNaldDate(chargeVersion.EFF_ST_DATE),
  endDate: date.mapNaldDate(chargeVersion.EFF_END_DATE),
  invoiceAccount: invoiceAccount.mapInvoiceAccount(chargeVersion),
  company: null,
  contact: null,
  address: null
});

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

  // Merge history on date
  const merged = helpers.charging.mergeHistory(roles);

  // Split history against document dates
  const split = helpers.charging.dateRangeSplitter(document, merged, 'billingRole');

  // Remove any items in array where the billing role is null following the date merge
  const filtered = split.filter(doc => doc.billingRole !== null);

  return filtered.map(doc => ({
    ...doc.billingRole,
    startDate: doc.effectiveStartDate,
    endDate: doc.effectiveEndDate
  }));
};

exports.mapLicenceHolderRoles = mapLicenceHolderRoles;
exports.mapBillingRoles = mapBillingRoles;
