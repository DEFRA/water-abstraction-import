'use strict';

const server = require('../../../../../server');
const db = require('../db');
const sql = require('./sql/purposes');
const cache = require('./cache');

const getPurposes = async (licenceId, FGAC_REGION_CODE, ISSUE_NO, INCR_NO) => {
  let query, params;
  if (ISSUE_NO && INCR_NO) {
    query = `
      select *
      from import."NALD_ABS_LIC_PURPOSES" p
      where p."AABV_AABL_ID" = $1
      and "FGAC_REGION_CODE" = $2
      and "AABV_ISSUE_NO" = $3
      and "AABV_INCR_NO" = $4;
    `;
    params = [licenceId, FGAC_REGION_CODE, ISSUE_NO, INCR_NO];
  } else {
    query = `
      select *
      from import."NALD_ABS_LIC_PURPOSES" p
      where p."AABV_AABL_ID" = $1 and "FGAC_REGION_CODE" = $2;
    `;
    params = [licenceId, FGAC_REGION_CODE];
  }
  return db.dbQuery(query, params);
};

const getPurposePoints = async (purposeId, regionCode) => {
  const params = [purposeId, regionCode];
  return db.dbQuery(sql.getPurposePoints, params);
};

const _createPurposeCache = () => {
  return cache.createCachedQuery(server, 'getPurpose', id => {
    const params = [id.primary, id.secondary, id.tertiary];
    return db.dbQuery(sql.getPurpose, params);
  });
};

const _getPurposeCache = _createPurposeCache();

const getPurpose = async (purpose) => {
  const { primary, secondary, tertiary } = purpose;
  const id = cache.createId('purpose', { primary, secondary, tertiary });
  return _getPurposeCache.get(id);
};

const getPurposePointLicenceAgreements = async (AABP_ID, FGAC_REGION_CODE) => {
  const params = [AABP_ID, FGAC_REGION_CODE];
  return db.dbQuery(sql.getPurposePointLicenceAgreements, params);
};

const getPurposePointLicenceConditions = async (AABP_ID, FGAC_REGION_CODE) => {
  const params = [AABP_ID, FGAC_REGION_CODE];
  return db.dbQuery(sql.getPurposePointLicenceConditions, params);
};

exports._getPurposeCache = _getPurposeCache;
exports._createPurposeCache = _createPurposeCache;
exports.getPurposes = getPurposes;
exports.getPurposePoints = getPurposePoints;
exports.getPurpose = getPurpose;
exports.getPurposePointLicenceAgreements = getPurposePointLicenceAgreements;
exports.getPurposePointLicenceConditions = getPurposePointLicenceConditions;
