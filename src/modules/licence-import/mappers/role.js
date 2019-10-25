const { last, find, pick } = require('lodash');
const helpers = require('@envage/water-abstraction-helpers');

const invoiceAccount = require('./invoice-account');

const date = require('./date');

const mapLicenceHolderRole = (document, licenceVersion) => ({
  role: 'licenceHolder',
  regionCode: licenceVersion.FGAC_REGION_CODE,
  partyId: licenceVersion.ACON_APAR_ID,
  addressId: licenceVersion.ACON_AADD_ID,
  startDate: date.getMaxDate([
    document.startDate,
    date.mapNaldDate(licenceVersion.EFF_ST_DATE)
  ]),
  endDate: date.getMinDate([
    document.endDate,
    date.mapNaldDate(licenceVersion.EFF_END_DATE)
  ])
});

const shouldAddRole = (acc, role) => {
  if (acc.length === 0) {
    return true;
  }
  const lastRole = last(acc);
  return !(
    (lastRole.role === role.role) &&
    (lastRole.regionCode === role.regionCode) &&
    (lastRole.partyId === role.partyId) &&
    (lastRole.addressId === role.addressId)
  );
};

const mergeRoles = roles => roles.reduce((acc, role) => {
  if (shouldAddRole(acc, role)) {
    acc.push(role);
  } else {
    acc[acc.length - 1].endDate = role.endDate;
  }
  return acc;
}, []);

const mapLicenceHolderRoles = (document, context) => {
  const roles = document._nald.map(licenceVersion => mapLicenceHolderRole(document, licenceVersion));
  const merged = mergeRoles(roles);

  for (let role of merged) {
    document.roles.push({
      ...pick(role, ['role', 'startDate', 'endDate']),
      ...context.parties[role.regionCode][role.partyId],
      address: context.addresses[role.regionCode][role.addressId]
    });
  }

  return document;
};

const mapInvoiceAccountRole = (chargeVersion, context) => ({
  role: 'billing',
  startDate: date.mapNaldDate(chargeVersion.EFF_ST_DATE),
  endDate: date.mapNaldDate(chargeVersion.EFF_END_DATE),
  invoiceAccount: invoiceAccount.mapInvoiceAccount(chargeVersion),
  ...context.parties[chargeVersion.FGAC_REGION_CODE][chargeVersion.ACON_APAR_ID],
  address: context.addresses[chargeVersion.FGAC_REGION_CODE][chargeVersion.ACON_AADD_ID]
});

const mapBillingRoles = (document, chargeVersions, context) => {
  const roles = chargeVersions.map(chargeVersion =>
    mapInvoiceAccountRole(chargeVersion, context)
  );

  const merged = helpers.charging.dateRangeSplitter(document, roles, 'billingRole');
  const filtered = merged.filter(doc => doc.billingRole !== null);

  document.roles.push(
    ...filtered.map(doc => ({
      ...doc.billingRole,
      startDate: doc.effectiveStartDate,
      endDate: doc.effectiveEndDate
    }))
  );

  return document;
};

exports.mapLicenceHolderRoles = mapLicenceHolderRoles;
exports.mapBillingRoles = mapBillingRoles;
