'use strict';

const common = {
  FGAC_REGION_CODE: 1,
  SOURCE_CODE: 'NALD',
  BATCH_RUN_DATE: '12/02/2018 20:02:11'
};

const getCommonObject = (...keys) => {
  return keys.reduce((acc, key) => {
    acc[key] = common[key];
    return acc;
  }, {});
};

const createNullKeys = (...keys) => {
  return keys.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {});
};

module.exports = {
  getCommonObject,
  createNullKeys
};
