'use strict'

const DateHelpers = require('../../../lib/date-helpers.js')

function go (party, licenceVersions, licenceRoles, naldAddresses) {
  const company = _company(party)
  const contact = _contact(party)
  const addresses = _addresses(naldAddresses)

  const licenceHolderAddresses = _licenceHolderAddresses(licenceVersions, addresses)
  const licenceRoleAddresses = _licenceRoleAddresses(licenceRoles, addresses)
  const licenceHolderContact = _licenceHolderContact(contact, licenceVersions)

  company.roleAddresses = [...licenceHolderAddresses, ...licenceRoleAddresses]
  company.licenceHolderContact = licenceHolderContact

  return company
}

function _address (address) {
  return {
    address1: _null(address.ADDR_LINE1),
    address2: _null(address.ADDR_LINE2),
    address3: _null(address.ADDR_LINE3),
    address4: _null(address.ADDR_LINE4),
    town: _null(address.TOWN),
    county: _null(address.COUNTY),
    postcode: _null(address.POSTCODE),
    country: _null(address.COUNTRY),
    externalId: `${address.FGAC_REGION_CODE}:${address.ID}`
  }
}

function _addresses (naldAddresses) {
  return naldAddresses.map((naldAddress) => {
    return _address(naldAddress)
  })
}

function _company (party) {
  const startName = party.FORENAME === 'null' ? party.INITIALS : party.FORENAME
  const parts = [
    _null(party.SALUTATION),
    _null(startName),
    _null(party.NAME)
  ]

  const filteredParts = parts.filter((part) => {
    return part
  })

  return {
    type: party.APAR_TYPE === 'PER' ? 'person' : 'organisation',
    name: filteredParts.join(' '),
    externalId: `${party.FGAC_REGION_CODE}:${party.ID}`
  }
}

function _contact (party) {
  if (party.APAR_TYPE === 'ORG') {
    return null
  }

  return {
    salutation: _null(party.SALUTATION),
    initials: _null(party.INITIALS),
    firstName: _null(party.FORENAME),
    lastName: _null(party.NAME),
    externalId: `${party.FGAC_REGION_CODE}:${party.ID}`
  }
}

function _licenceHolderAddresses (licenceVersions, addresses) {
  // Get the widest date range for each address
  const mapped = {}

  for (const licenceVersion of licenceVersions) {
    const id = licenceVersion.ACON_AADD_ID
    const currentStart = mapped[id]?.startDate
    const currentEnd = mapped[id]?.endDate
    const transformedStartDate = DateHelpers.mapNaldDate(licenceVersion.EFF_ST_DATE)
    const address = addresses.find((address) => {
      return address.externalId === `${licenceVersion.FGAC_REGION_CODE}:${id}`
    })

    mapped[id] = {
      role: 'licenceHolder',
      startDate: DateHelpers.getMinDate([transformedStartDate, currentStart]),
      endDate: DateHelpers.getEndDate(licenceVersion, currentEnd),
      address
    }
  }

  return Object.values(mapped)
}

function _licenceHolderContact (contact, licenceVersions) {
  if (!contact || licenceVersions.length === 0) {
    return null
  }

  const startDates = licenceVersions.map((licenceVersion) => {
    return DateHelpers.mapNaldDate(licenceVersion.EFF_ST_DATE)
  })

  return {
    role: 'licenceHolder',
    startDate: DateHelpers.getMinDate(startDates),
    endDate: null,
    contact
  }
}

function _licenceRoleAddresses (licenceRoles, addresses) {
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

  return Object.values(grouped).map((addressGroup) => {
    const { FGAC_REGION_CODE: regionCode, ACON_AADD_ID: addressId, ALRT_CODE: roleCode } = addressGroup[0]
    const startDates = addressGroup.map((row) => {
      return DateHelpers.mapNaldDate(row.EFF_ST_DATE)
    })

    const endDates = addressGroup.map((row) => {
      return DateHelpers.mapNaldDate(row.EFF_END_DATE)
    })

    const address = addresses.find((address) => {
      return address.externalId === `${regionCode}:${addressId}`
    })

    return {
      role: roleCode === 'RT' ? 'returnsTo' : null,
      startDate: DateHelpers.getMinDate(startDates),
      endDate: DateHelpers.getMaxDate(endDates),
      address
    }
  })
}

function _null (value) {
  return value === 'null' ? null : value
}

// function _mapParties (party, company, contact) {
//   const mappedParties = _regionSkeleton()

//   mappedParties[party.FGAC_REGION_CODE][party.ID] = { company, contact }

//   return mappedParties
// }

// function _regionSkeleton () {
//   return { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}, 8: {} }
// }

module.exports = {
  go
}
