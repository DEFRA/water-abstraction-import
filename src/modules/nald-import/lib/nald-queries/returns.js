'use strict'

const db = require('../db')
const sql = require('./sql/returns')

/**
 * Get purposes attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPurposes = (formatId, regionCode) => {
  return db.dbQuery(sql.getFormatPurposes, [formatId, regionCode])
}

/**
 * Get points attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPoints = (formatId, regionCode) => {
  return db.dbQuery(sql.getFormatPoints, [formatId, regionCode])
}

module.exports = {
  getFormatPoints,
  getFormatPurposes
}
