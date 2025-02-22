'use strict'

const { sentenceCase } = require('sentence-case')

const helpers = require('@envage/water-abstraction-helpers')

function go (permitData) {
  const metadata = _metadata(permitData)

  return {
    system_external_id: permitData.LIC_NO,
    metadata
  }
}

function _contacts (permitData) {
  // NOTE: We know permitData has a `current_version` property which already has this. But because of the fubar
  // with setting contacts against the `party` assigned to it (see notes in fetch-current-version.js), they coded a
  // solution to find the current version from the `versions` property instead.
  //
  // We could clean all this up, but there are only so many hours in the day!
  const currentVersion = helpers.nald.findCurrent(permitData.data.versions)

  if (!currentVersion) {
    return []
  }

  const licenceHolderParty = currentVersion.parties.find((party) => {
    return party.ID === currentVersion.ACON_APAR_ID
  })

  const licenceHolderAddress = licenceHolderParty.contacts.find((contact) => {
    return contact.AADD_ID === currentVersion.ACON_AADD_ID
  })

  const contacts = [{
    role: 'Licence holder',
    ...helpers.nald.formatting.crmNameFormatter(licenceHolderParty),
    ...helpers.nald.formatting.addressFormatter(licenceHolderAddress.party_address)
  }]

  permitData.data.roles.forEach((role) => {
    contacts.push({
      role: sentenceCase(role.role_type.DESCR),
      ...helpers.nald.formatting.crmNameFormatter(role.role_party),
      ...helpers.nald.formatting.addressFormatter(role.role_address)
    })
  })

  return helpers.nald.transformNull(contacts)
}

function _metadata (permitData) {
  const contacts = _contacts(permitData)

  if (!permitData.data.current_version) {
    return {
      contacts,
      IsCurrent: false
    }
  }

  const { address, expiry_date, party, version_effective_date } = permitData.data.current_version

  const metadata = {
    Name: _naldNullToEmptyString(party.NAME),
    Salutation: _naldNullToEmptyString(party.SALUTATION),
    Initials: _naldNullToEmptyString(party.INITIALS),
    Forename: _naldNullToEmptyString(party.FORENAME),
    AddressLine1: _naldNullToEmptyString(address.ADDR_LINE1),
    AddressLine2: _naldNullToEmptyString(address.ADDR_LINE2),
    AddressLine3: _naldNullToEmptyString(address.ADDR_LINE3),
    AddressLine4: _naldNullToEmptyString(address.ADDR_LINE4),
    Town: _naldNullToEmptyString(address.TOWN),
    County: _naldNullToEmptyString(address.COUNTY),
    Postcode: _naldNullToEmptyString(address.POSTCODE),
    Country: _naldNullToEmptyString(address.COUNTRY),
    Expires: expiry_date,
    Modified: version_effective_date,
    IsCurrent: true,
    contacts
  }

  return JSON.stringify(metadata)
}

function _naldNullToEmptyString (value) {
  if (!value || value === 'null') {
    return ''
  }

  return value
}

module.exports = {
  go
}
