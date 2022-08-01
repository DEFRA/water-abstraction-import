const { groupBy, sortBy } = require('lodash')
const helpers = require('@envage/water-abstraction-helpers')
const date = require('./date')
const roles = require('./roles')

const mapInvoiceAccount = chargeVersion => ({
  invoiceAccountNumber: chargeVersion.IAS_CUST_REF
})

const getNormalisedName = str => {
  return str.trim().toLowerCase().replace(/ltd\.?$/, 'limited')
}

/**
 * Gets the agent company ID for the invoice account row
 * @param {Object} row - single row from invoice account query
 * @return {String|Null} - agent company ID or null if no agent
 */
const getAgentCompanyExternalId = row => {
  const {
    licence_holder_party_id: licenceHolderPartyId,
    licence_holder_party_name: licenceHolderPartyName,
    invoice_account_party_name: invoiceAccountPartyName,
    FGAC_REGION_CODE: regionCode,
    ACON_APAR_ID: invoiceAccountPartyId
  } = row

  const isDifferentId = licenceHolderPartyId !== invoiceAccountPartyId
  const isDifferentName = getNormalisedName(licenceHolderPartyName) !== getNormalisedName(invoiceAccountPartyName)

  return isDifferentId && isDifferentName ? `${regionCode}:${invoiceAccountPartyId}` : null
}

const mapInvoiceAccountAddresses = (iasAccounts, context) => {
  // Sort group by transfer date
  const sorted = sortBy(iasAccounts, row => date.mapTransferDate(row.IAS_XFER_DATE))

  // Map to new data structure
  const addresses = sorted.map((row, i, arr) => ({
    role: roles.ROLE_BILLING,
    startDate: date.mapTransferDate(row.IAS_XFER_DATE),
    endDate: i === arr.length - 1 ? null : date.getPreviousDay(date.mapTransferDate(arr[i + 1].IAS_XFER_DATE)),
    address: context.addresses[row.FGAC_REGION_CODE][row.ACON_AADD_ID],
    agentCompany: {
      externalId: getAgentCompanyExternalId(row)
    }
  }))

  // Merge on date range
  return helpers.charging.mergeHistory(addresses)
}

const mapInvoiceAccounts = (iasAccounts, context) => {
  // Group by IAS customer ref (invoice account number)
  const groups = groupBy(iasAccounts, row => row.IAS_CUST_REF)
  return Object.values(groups).map(group => {
    const addresses = mapInvoiceAccountAddresses(group, context)

    return {
      invoiceAccountNumber: group[0].IAS_CUST_REF,
      startDate: addresses[0].startDate,
      endDate: null,
      addresses
    }
  })
}

module.exports = {
  mapInvoiceAccount,
  mapInvoiceAccounts
}
