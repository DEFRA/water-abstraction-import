const contact = require('./contact')
const company = require('./company')
const { createRegionSkeleton } = require('./region-skeleton')

/**
 * Maps parties to a hash containing companies and contacts
 * @param {Array} parties
 * @return {Object}
 */

const mapParties = (parties) => {
  const mappedParties = createRegionSkeleton()
  for (const party of parties) {
    const value = {
      company: company.mapCompany(party),
      contact: contact.mapContact(party)
    }
    mappedParties[party.FGAC_REGION_CODE][party.ID] = value
  }

  return mappedParties
}

module.exports = {
  mapParties
}
