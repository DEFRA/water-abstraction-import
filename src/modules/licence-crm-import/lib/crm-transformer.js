'use strict'

const { sentenceCase } = require('sentence-case')

const helpers = require('@envage/water-abstraction-helpers')

const { today } = require('../../../lib/general.js')
const { compareDates, mapNaldDate } = require('../../../lib/date-helpers.js')

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

  for (const role of permitData.data.roles) {
    const importRole = _importRole(role)

    if (!importRole) {
      continue
    }

    contacts.push({
      role: sentenceCase(role.role_type.DESCR),
      ...helpers.nald.formatting.crmNameFormatter(role.role_party),
      ...helpers.nald.formatting.addressFormatter(role.role_address)
    })
  }

  return helpers.nald.transformNull(contacts)
}

function _importRole (role) {
  // The role is disabled so ignore contacts of that type
  const roleTypeDisabled = role.role_type.DISABLED === 'Y'

  if (roleTypeDisabled) {
    return false
  }

  // The role (contact) effective start date is populated and greater than today's date
  const startDate = mapNaldDate(role.role_detail.EFF_ST_DATE)
  const todaysDate = today()

  if (startDate && (compareDates(new Date(startDate), todaysDate) !== -1)) {
    return false
  }

  // The role (contact) effective end date is populated and less than today's date
  const endDate = mapNaldDate(role.role_detail.EFF_END_DATE)

  if (endDate && compareDates(new Date(endDate), todaysDate) === -1) {
    return false
  }

  return true
}

function _metadata (permitData) {
  const contacts = _contacts(permitData)

  if (!permitData.data.current_version) {
    return {
      contacts,
      IsCurrent: false
    }
  }

  const currentVersion = permitData.data.current_version

  const metadata = {
    Name: _naldNullToEmptyString(currentVersion.party.NAME),
    Salutation: _naldNullToEmptyString(currentVersion.party.SALUTATION),
    Initials: _naldNullToEmptyString(currentVersion.party.INITIALS),
    Forename: _naldNullToEmptyString(currentVersion.party.FORENAME),
    AddressLine1: _naldNullToEmptyString(currentVersion.address.ADDR_LINE1),
    AddressLine2: _naldNullToEmptyString(currentVersion.address.ADDR_LINE2),
    AddressLine3: _naldNullToEmptyString(currentVersion.address.ADDR_LINE3),
    AddressLine4: _naldNullToEmptyString(currentVersion.address.ADDR_LINE4),
    Town: _naldNullToEmptyString(currentVersion.address.TOWN),
    County: _naldNullToEmptyString(currentVersion.address.COUNTY),
    Postcode: _naldNullToEmptyString(currentVersion.address.POSTCODE),
    Country: _naldNullToEmptyString(currentVersion.address.COUNTRY),
    Expires: currentVersion.expiry_date,
    Modified: currentVersion.version_effective_date,
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
