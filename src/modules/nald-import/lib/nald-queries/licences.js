'use strict';

const db = require('../db');
const sql = require('./sql/licences');

const getLicence = async (licenceNo) => {
  return db.dbQuery(sql.getLicence, [licenceNo]);
};

const getCurrentVersion = async (licenceId, regionCode) => {
  const rows = await db.dbQuery(sql.getCurrentVersion, [licenceId, regionCode]);
  return rows.length ? rows[0] : null;
};

const getVersions = async (licenceId, regionCode) => {
  return db.dbQuery(sql.getVersions, [licenceId, regionCode]);
};

/**
 * Get current formats for the specified licence
 * @param {Number} licenceId - the ID from the NALD_ABS_LICENCES table
 * @param {Number} regionCode - the FGAC_REGION_CODE
 * @return {Promise} resolves with list of formats
 */
const getCurrentFormats = async (licenceId, regionCode) => {
  return db.dbQuery(sql.getCurrentFormats, [licenceId, regionCode]);
};

module.exports = {
  getLicence,
  getCurrentVersion,
  getVersions,
  getCurrentFormats
};
