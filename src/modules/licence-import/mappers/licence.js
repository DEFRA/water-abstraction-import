const date = require('./date');
const str = require('./str');
const { identity, cloneDeep } = require('lodash');

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
    startDate: date.mapNaldDate(data.ORIG_EFF_DATE),
    endDate: date.getMinDate(endDates),
    documents: [],
    agreements: [],
    externalId: `${data.FGAC_REGION_CODE}:${data.ID}`,
    _nald: data
  };
};

const omitNaldData = licence => {
  const copy = cloneDeep(licence);
  delete copy._nald;
  copy.documents.forEach(doc => {
    delete doc._nald;
    doc.roles.forEach(role => {
      if (role.company) {
        delete role.company._nald;
      }
      if (role.address) {
        delete role.address._nald;
      }
      if (role.contact) {
        delete role.contact._nald;
      }
    });
  });
  return copy;
};

exports.mapLicence = mapLicence;
exports.omitNaldData = omitNaldData;
