'use strict'

const server = require('../../../../../../server.js')
const moment = require('moment')
const db = require('../db')
const cache = require('./cache')
const sql = require('./sql/returns')

/**
 * Gets form logs for specified licence number
 * @param {String} licenceNumber
 * @return {Promise} resolves with array of DB records
 */
const getFormats = (licenceNumber) => {
  return db.dbQuery(sql.getFormats, [licenceNumber])
}

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

/**
 * Get form logs for specified return format
 * @param {Number} formatId - the ARTY_ID
 * @return {Promise} resolves with array of DB records
 */
const getLogs = (formatId, regionCode) => {
  return db.dbQuery(sql.getLogs, [formatId, regionCode])
}

/**
 * Get returns lines
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} dateFrom - e.g. YYYY-MM-DD
 * @param {String} dateTo - e.g. YYYY-MM-DD
 * @return {Promise} resolves with array of DB records
 */
const getLines = (formatId, regionCode, dateFrom, dateTo) => {
  const params = [formatId, regionCode, dateFrom, dateTo]
  return db.dbQuery(sql.getLines, params)
}

/**
 * Get returns lines for log
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} logDateFrom - e.g. DD/MM/YYYY
 * @return {Promise} resolves with array of DB records
 */
const getLogLines = (formatId, regionCode, logDateFrom) => {
  const from = moment(logDateFrom, 'DD/MM/YYYY').format('YYYYMMDD') + '000000'
  const params = [formatId, regionCode, from]
  return db.dbQuery(sql.getLogLines, params)
}

/**
 * Checks for nil return over the specified time period
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} dateFrom - e.g. YYYY-MM-DD
 * @param {String} dateTo - e.g. YYYY-MM-DD
 * @return {Promise} resolves with boolean
 */
const isNilReturn = async (formatId, regionCode, dateFrom, dateTo) => {
  const params = [formatId, regionCode, dateFrom, dateTo]
  const rows = await db.dbQuery(sql.isNilReturn, params)
  return rows[0].total_qty === 0
}

/**
 * Gets the split date for considering returns as either current / non current
 * Originally this date was the EFF_ST_DATE of the current licence version
 * however this has been modified to only split if a licence version has
 * a mod log reason code of SUCC - 'Succession To A Whole Licence/Licence Transfer'
 * @param {String} licenceNumber - the licence number
 * @return {String|null} split date in format YYYY-MM-DD, or null if none found
 */
const getSplitDate = async (licenceNumber) => {
  const rows = await db.dbQuery(sql.getSplitDate, [licenceNumber])

  return (rows.length === 1)
    ? moment(rows[0].EFF_ST_DATE, 'DD/MM/YYYY').format('YYYY-MM-DD')
    : null
}

/**
 * Gets the reason code from the mod log relating to a new return version
 * @param  {Number}  licenceId     - the NALD licence ID
 * @param  {Number}  regionCode    - the NALD FGAC_REGION_CODE
 * @param  {Number}  versionNumber - the version number of the return
 * @return {Promise<Array>}          resolves with reason codes
 */
const getReturnVersionReason = async (licenceId, regionCode, versionNumber) => {
  const id = cache.createId('returnVersionReason', {
    licenceId,
    regionCode,
    versionNumber
  })
  return _getReturnVersionReasonCache.get(id)
}

const _createReturnVersionReasonCache = () => {
  return cache.createCachedQuery(server, 'getReturnVersionReason', id => {
    const params = [id.licenceId, id.versionNumber, id.regionCode]
    return db.dbQuery(sql.getReturnVersionReason, params)
  })
}

const _getReturnVersionReasonCache = _createReturnVersionReasonCache()

module.exports = {
  _createReturnVersionReasonCache,
  _getReturnVersionReasonCache,
  getFormats,
  getFormatPurposes,
  getFormatPoints,
  getLogs,
  getLines,
  getLogLines,
  isNilReturn,
  getSplitDate,
  getReturnVersionReason
}
