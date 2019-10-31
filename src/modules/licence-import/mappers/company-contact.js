const date = require('./date');

const mapCompanyContacts = (contact, licenceVersions) => {
  if (contact === null) {
    return [];
  }

  // Ignore draft versions
  const filtered = licenceVersions.filter(row => row.STATUS !== 'DRAFT');
  const startDates = filtered.map(row => date.mapNaldDate(row.EFF_ST_DATE));

  return [
    {
      startDate: date.getMinDate(startDates),
      endDate: null,
      contact
    }
  ];
};

exports.mapCompanyContacts = mapCompanyContacts;
