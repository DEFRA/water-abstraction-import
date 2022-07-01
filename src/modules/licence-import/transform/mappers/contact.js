const str = require('./str')

/**
 * Maps NALD party to CRM contact
 * @param {Object} NALD party
 * @return {Object}
 */
const mapContact = party => {
  if (party.APAR_TYPE === 'ORG') {
    return null
  }
  return {
    salutation: str.mapNull(party.SALUTATION),
    initials: str.mapNull(party.INITIALS),
    firstName: str.mapNull(party.FORENAME),
    lastName: str.mapNull(party.NAME),
    externalId: `${party.FGAC_REGION_CODE}:${party.ID}`,
    _nald: party
  }
}

module.exports = {
  mapContact
}
