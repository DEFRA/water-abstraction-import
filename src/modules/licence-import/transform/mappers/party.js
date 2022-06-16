const { set } = require('lodash');
const contact = require('./contact');
const company = require('./company');
const { createRegionSkeleton } = require('./region-skeleton');

/**
 * Maps parties to a hash containing companies and contacts
 * @param {Array} parties
 * @return {Object}
 */
const mapParties = parties => parties.reduce((acc, party) => {
  set(acc, `${party.FGAC_REGION_CODE}.${party.ID}`, {
    company: company.mapCompany(party),
    contact: contact.mapContact(party)
  });
  return acc;
}, createRegionSkeleton());

module.exports = {
  mapParties
};
