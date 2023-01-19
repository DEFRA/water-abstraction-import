const str = require('./str')

/**
 * Maps a party object to a full name for organisation/person
 * @param {Object} party
 * @return {String}
 */
const mapName = party => {
  const firstNameKey = party.FORENAME === 'null' ? 'INITIALS' : 'FORENAME'

  const parts = [
    party.SALUTATION,
    party[firstNameKey],
    party.NAME
  ]

  return parts
    .map(str.mapNull)
    .filter(value => value)
    .join(' ')
}

/**
 * Maps NALD party to CRM company
 * @param {Object} NALD party
 * @return {Object}
 */
const mapCompany = party => ({
  type: party.APAR_TYPE === 'PER' ? 'person' : 'organisation',
  name: mapName(party),
  externalId: `${party.FGAC_REGION_CODE}:${party.ID}`,
  _nald: party
})

module.exports = {
  mapCompany
}
