'use strict'

const moment = require('moment')
const Helpers = require('@envage/water-abstraction-helpers')

const db = require('../../../lib/connectors/db.js')
const { mapProductionMonth } = require('./transform-returns-helpers.js')

/**
 * Gets the due date for the supplied cycle end date and format
 * @param  {String}  endDate - cycle end date YYYY-MM-DD
 * @param  {Object}  format  - the format object
 *
 * @return {Promise<String>} resolved with due date YYYY-MM-DD
 */
async function go (endDate, format) {
  let refDate = endDate

  const returnVersionEndDate = _returnVersionEndDate(format)

  // If the end date of the calculated return cycle matches the end date of
  // the return version, we may have a split
  if (endDate === returnVersionEndDate) {
    // Find the mod log reason codes for the following return version
    const nextReturnVersion = parseInt(format.VERS_NO) + 1
    const results = await _returnVersionReasons(format.AABL_ID, format.FGAC_REGION_CODE, nextReturnVersion)

    // If the code matches, use the end date of the full return cycle to
    // calculate the due date
    if (_variationCode(results)) {
      const { isSummer } = mapProductionMonth(format.FORM_PRODN_MONTH)
      refDate = Helpers.returns.date.getPeriodEnd(endDate, isSummer)
    }
  }

  // Due to Coronavirus in 2020, the winter/all year period ending 2020-03-31
  // had the deadline extended to 16 October
  if (refDate === '2020-03-31') {
    return '2020-10-16'
  }

  return moment(refDate, 'YYYY-MM-DD').add(28, 'days').format('YYYY-MM-DD')
}

function _returnVersionEndDate (format) {
  if (format.EFF_END_DATE === 'null') {
    return null
  }

  return moment(format.EFF_END_DATE, 'DD/MM/YYYY').format('YYYY-MM-DD')
}

/**
 * Checks whether the results returned from the mod logs query contains
 * one of the relevant reason codes
 * @param  {Array}  modLogs - results from the getReturnVersionReason query
 * @return {Boolean}         true if a code is matched
 *
 * @private
 */
function _variationCode (modLogs) {
  const eventCodes = ['VARF', 'VARM', 'AMND', 'NAME', 'REDS', 'SPAC', 'SPAN', 'XCORR']
  const codes = modLogs.map(row => row.AMRE_CODE)
  const intersection = (arr, ...args) =>
    arr.filter(item => args.every(arr => arr.includes(item)))

  return intersection(codes, eventCodes)?.length > 0
}

/**
 * Gets the reason code from the mod log relating to a new return version
 *
 * @private
 */
async function _returnVersionReasons (licenceId, regionCode, versionNumber) {
  const params = [licenceId, versionNumber, regionCode]
  const query = `
    SELECT
      l."AMRE_CODE"
    FROM
      "import"."NALD_RET_VERSIONS" rv
    INNER JOIN
      "import"."NALD_MOD_LOGS" l
      ON l."ARVN_AABL_ID" = rv."AABL_ID"
      AND l."ARVN_VERS_NO" = rv."VERS_NO"
      AND l."FGAC_REGION_CODE" = rv."FGAC_REGION_CODE"
      AND l."AMRE_AMRE_TYPE" = 'RET'
    WHERE
      rv."AABL_ID" = $1
      AND rv."VERS_NO" = $2
      AND rv."FGAC_REGION_CODE" = $3;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
