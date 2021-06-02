'use strict';

const mapPurposeConditionFromNALD = data => {
  return {
    code: data.ACIN_CODE,
    subcode: data.ACIN_SUBCODE,
    param1: data.PARAM1 === 'null'
      ? null
      : data.PARAM1,
    param2: data.PARAM2 === 'null'
      ? null
      : data.PARAM2,
    notes: data.TEXT === 'null'
      ? null
      : data.TEXT,
    purposeExternalId: `${data.FGAC_REGION_CODE}:${data.AABP_ID}`,
    externalId: `${data.ID}:${data.FGAC_REGION_CODE}:${data.AABP_ID}`
  };
};

exports.mapPurposeConditionFromNALD = mapPurposeConditionFromNALD;
