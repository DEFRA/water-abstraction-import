const contact = require('./contact')
const company = require('./company')
const { createRegionSkeleton } = require('./region-skeleton')

/**
 * Maps parties to a hash containing companies and contacts
 * @param {Array} parties
 * @return {Object}
 */
const mapParties = parties => parties.reduce((acc, party) => {
  const set = (obj, path, value) => {
    // Regex explained: https://regexr.com/58j0k
    const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g)

    pathArray.reduce((acc, key, i) => {
      if (acc[key] === undefined) acc[key] = {}
      if (i === pathArray.length - 1) acc[key] = value

      return acc[key]
    }, obj)
  }
  set(acc, `${party.FGAC_REGION_CODE}.${party.ID}`, {
    company: company.mapCompany(party),
    contact: contact.mapContact(party)
  })
  return acc
}, createRegionSkeleton())

module.exports = {
  mapParties
}
