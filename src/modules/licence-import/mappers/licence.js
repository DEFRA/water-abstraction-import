const date = require('./date');
const str = require('./str');
const { identity } = require('lodash');

const mapLicence = data => {
  const endDates = [
    data.EXPIRY_DATE,
    data.REV_DATE,
    data.LAPSED_DATE
  ]
    .map(str.mapNull)
    .filter(identity)
    .map(date.mapNaldDate);

  return {
    licenceNumber: data.LIC_NO,
    endDate: date.getMinDate(endDates),
    _nald: data
  };
};

exports.mapLicence = mapLicence;
