const contact = require('./contact');
const company = require('./company');
const { set } = require('lodash');

const regionSkeleton = {
  1: {},
  2: {},
  3: {},
  4: {},
  5: {},
  6: {},
  7: {},
  8: {}
};

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
}, regionSkeleton);

exports.mapParties = mapParties;
