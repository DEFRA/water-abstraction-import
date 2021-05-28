'use strict';
const nald = require('@envage/water-abstraction-helpers').nald;

const mapPurposeConditionFromNALD = data => {
  return {
    code: data.ACIN_CODE,
    subcode: data.ACIN_SUBCODE,
    param1: nald.stringNullToNull(data.PARAM1) === null
      ? null
      : data.PARAM1,
    param2: nald.stringNullToNull(data.PARAM2) === null
      ? null
      : data.PARAM2,
    notes: nald.stringNullToNull(data.TEXT) === null
      ? null
      : data.TEXT,
    purposeExternalId: `${data.FGAC_REGION_CODE}:${data.AABP_ID}`,
    externalId: `${data.ID}:${data.FGAC_REGION_CODE}:${data.AABP_ID}`
  };
};

exports.mapPurposeConditionFromNALD = mapPurposeConditionFromNALD;
