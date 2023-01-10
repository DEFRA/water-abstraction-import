'use strict'

const date = require('./date')
const roles = require('./roles')

/**
 * Gets the end date for a company address from licence version data
 * @param {Object} row - from NALD licence/licence version data
 * @param {String,Null} currentEnd - the current value of the end date in the accumulator
 */
const getEndDate = (row, currentEnd) => {
  // Get all end dates for this row
  const endDates = [row.EFF_END_DATE, row.EXPIRY_DATE, row.REV_DATE, row.LAPSED_DATE]
    .map(date.mapNaldDate)
    .filter(value => value)

  const arr = [date.getMinDate(endDates), currentEnd]

  return arr.includes(null) ? null : date.getMaxDate(arr)
}

const getLicenceHolderAddresses = (licenceVersions, context) => {
  // Sort licence versions by start date
  const sorted = licenceVersions.sort((startDate1, startDate2) => {
    if ((startDate1, date.mapNaldDate(startDate1.EFF_ST_DATE)) > (startDate2, date.mapNaldDate(startDate2.EFF_ST_DATE))) {
      return 1
    } else {
      return -1
    }
  })

  // Get the widest date range for each address
  const mapped = {}
  for (const row of sorted) {
    const id = row.ACON_AADD_ID
    const currentStart = mapped[id]?.startDate
    const currentEnd = mapped[id]?.endDate
    mapped[id] = {
      role: roles.ROLE_LICENCE_HOLDER,
      startDate: date.getMinDate([date.mapNaldDate(row.EFF_ST_DATE), currentStart]),
      endDate: getEndDate(row, currentEnd),
      address: context.addresses[row.FGAC_REGION_CODE][id]
    }
  }
  return Object.values(mapped)
}

const getBillingAddresses = (chargeVersions, context) => {
  const grouped = chargeVersions.reduce((group, row) => {
    group[row.ACON_AADD_ID] = group[row.ACON_AADD_ID] ?? []
    group[row.ACON_AADD_ID].push(row)

    return group
  }, {})
  return Object.values(grouped).map(addressGroup => {
    const { FGAC_REGION_CODE: regionCode, ACON_AADD_ID: addressId } = addressGroup[0]
    const dates = addressGroup.map(row => date.mapTransferDate(row.IAS_XFER_DATE))
    return {
      role: roles.ROLE_BILLING,
      startDate: date.getMinDate(dates),
      endDate: null,
      address: context.addresses[regionCode][addressId]
    }
  })
}

const getLicenceRoleAddresses = (licenceRoles, context) => {
  // Group by roles with the same address and role
  let grouped = {}
  if (licenceRoles) {
    grouped = licenceRoles.reduce((group, item) => {
      const groupingKey = `${item.FGAC_REGION_CODE}.${item.ACON_AADD_ID}.${item.ALRT_CODE}`
      group[groupingKey] = group[groupingKey] ?? []
      group[groupingKey].push(item)

      return group
    }, {})
  }
  return Object.values(grouped).map(addressGroup => {
    const { FGAC_REGION_CODE: regionCode, ACON_AADD_ID: addressId, ALRT_CODE: roleCode } = addressGroup[0]
    const startDates = addressGroup.map(row => date.mapNaldDate(row.EFF_ST_DATE))
    const endDates = addressGroup.map(row => date.mapNaldDate(row.EFF_END_DATE))
    return {
      role: roles.naldRoles.get(roleCode),
      startDate: date.getMinDate(startDates),
      endDate: date.getMaxDate(endDates),
      address: context.addresses[regionCode][addressId]
    }
  })
}

/**
 * Gets an array of the company addresses to import
 * @param {Array<Object>} licenceVersions - from NALD licence/licence version data
 * @param {Array<Object>} chargeVersions - from NALD charge version data
 * @param {Object} context - contains company/contact/address data
 * @return {Array} an array of company addresses
 */
const mapCompanyAddresses = (licenceVersions, chargeVersions, licenceRoles, context) => {
  return [
    ...getLicenceHolderAddresses(licenceVersions, context),
    ...getBillingAddresses(chargeVersions, context),
    ...getLicenceRoleAddresses(licenceRoles, context)
  ]
}

module.exports = {
  mapCompanyAddresses
}
