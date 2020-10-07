'use strict';

const { groupBy, sortBy, first, last, identity } = require('lodash');
const date = require('./date');

const mapExternalId = row =>
  `${row.FGAC_REGION_CODE}:${row.AABL_ID}:${row.ISSUE_NO}`;

const statuses = {
  CURR: 'current',
  SUPER: 'superseded',
  DRAFT: 'draft'
};
const mapStatus = status => statuses[status];

const getDocumentEndDate = (licenceVersion, licence) => {
  const endDates = [licence.endDate, licenceVersion.EFF_END_DATE]
    .map(date.mapNaldDate)
    .filter(identity);

  return date.getMinDate(endDates);
};

const mapDocuments = (data, licence) => {
  // Group licence versions by issue number
  const issueGroups = groupBy(data, row => parseInt(row.ISSUE_NO));

  return Object.values(issueGroups).map(issueGroup => {
    // Sort group by increment number
    const sorted = sortBy(issueGroup, row => parseInt(row.INCR_NO));

    const earliestIncrement = first(sorted);
    const mostRecentIncrement = last(sorted);

    return {
      documentRef: licence.licenceNumber,
      versionNumber: parseInt(earliestIncrement.ISSUE_NO),
      status: mapStatus(mostRecentIncrement.STATUS),
      startDate: date.mapNaldDate(earliestIncrement.EFF_ST_DATE),
      endDate: getDocumentEndDate(mostRecentIncrement, licence),
      externalId: mapExternalId(mostRecentIncrement),
      roles: [],
      _nald: sorted
    };
  });
};

exports.mapDocuments = mapDocuments;
