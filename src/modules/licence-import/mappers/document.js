const { groupBy, sortBy, last, identity, uniq } = require('lodash');
const date = require('./date');
const str = require('./str');

const mapExternalId = (row) =>
  `${row.FGAC_REGION_CODE}:${row.AABL_ID}:${row.ISSUE_NO}:${row.INCR_NO}`;

const statuses = {
  CURR: 'current',
  SUPER: 'superseded',
  DRAFT: 'draft'
};
const mapStatus = status => statuses[status];

const getDocumentEndDate = (licenceVersions, licence) => {
  // Map to a document
  // the start date is from the first increment, and the end date from the last
  const endDates = [
    licence.endDate,
    last(licenceVersions).EFF_END_DATE
  ]
    .map(str.mapNull)
    .filter(identity)
    .map(date.mapNaldDate);

  return date.getMinDate(endDates);
};

const mapDocuments = (data, licence) => {
  // Remove draft rows
  const filtered = data.filter(row => row.STATUS !== 'DRAFT');

  // Group licence versions by issue number
  const issueGroups = groupBy(filtered, row => parseInt(row.ISSUE_NO));

  return Object.values(issueGroups).map(issueGroup => {
    // Sort group by increment number
    const sorted = sortBy(issueGroup, row => parseInt(row.INCR_NO));

    return {
      documentRef: licence.licenceNumber,
      issueNumber: parseInt(sorted[0].ISSUE_NO),
      status: mapStatus(sorted[0].STATUS),
      startDate: date.mapNaldDate(sorted[0].EFF_ST_DATE),
      endDate: getDocumentEndDate(sorted, licence),
      externalId: mapExternalId(last(sorted)),
      roles: [],
      _nald: sorted
    };
  });
};

const mapPartyIds = data =>
  uniq(data.map(row => row.ACON_APAR_ID));

const mapAddressIds = data =>
  uniq(data.map(row => row.ACON_AADD_ID));

exports.mapDocuments = mapDocuments;
exports.mapPartyIds = mapPartyIds;
exports.mapAddressIds = mapAddressIds;
