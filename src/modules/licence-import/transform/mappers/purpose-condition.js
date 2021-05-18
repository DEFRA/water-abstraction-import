'use strict';

const mapPurposeCondition = data => {
  const condition = {
    code: data.ACIN_CODE,
    subcode: data.ACIN_SUBCODE,
    param1: data.PARAM1,
    param2: data.PARAM2,
    notes: data.TEXT,
    purposeExternalId: `${data.FGAC_REGION_CODE}:${data.AABP_ID}`,
    externalId: `${data.ID}:${data.FGAC_REGION_CODE}:${data.AABP_ID}`
  };

  return condition;
};

exports.mapPurposeCondition = mapPurposeCondition;
