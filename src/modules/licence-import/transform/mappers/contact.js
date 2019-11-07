const str = require('./str');

const mapFirstName = party => {
  if (party.FORENAME === 'null') {
    return str.mapNull(party.INITIALS);
  }
  return str.mapNull(party.FORENAME);
};

/**
 * Maps NALD party to CRM contact
 * @param {Object} NALD party
 * @return {Object}
 */
const mapContact = party => {
  if (party.APAR_TYPE === 'ORG') {
    return null;
  }
  return {
    salutation: str.mapNull(party.SALUTATION),
    firstName: mapFirstName(party),
    lastName: str.mapNull(party.NAME),
    externalId: `${party.FGAC_REGION_CODE}:${party.ID}`,
    _nald: party
  };
};

exports.mapContact = mapContact;
