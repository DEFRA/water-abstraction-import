const date = require('./date');
const roles = require('./roles');

const getLicenceHolderContact = (contact, licenceVersions) => {
  const startDates = licenceVersions.map(row => date.mapNaldDate(row.EFF_ST_DATE));
  return {
    role: roles.ROLE_LICENCE_HOLDER,
    startDate: date.getMinDate(startDates),
    endDate: null,
    contact
  };
};

const getBillingContact = (contact, chargeVersions) => {
  const startDates = chargeVersions.map(row => date.mapTransferDate(row.IAS_XFER_DATE));
  return {
    role: roles.ROLE_BILLING,
    startDate: date.getMinDate(startDates),
    endDate: null,
    contact
  };
};

const mapCompanyContacts = (contact, licenceVersions, chargeVersions) => {
  if (contact === null) {
    return [];
  }

  const contacts = [];

  if (licenceVersions.length > 0) {
    contacts.push(getLicenceHolderContact(contact, licenceVersions));
  }

  if (chargeVersions.length > 0) {
    contacts.push(getBillingContact(contact, chargeVersions));
  }

  return contacts;
};

exports.mapCompanyContacts = mapCompanyContacts;
