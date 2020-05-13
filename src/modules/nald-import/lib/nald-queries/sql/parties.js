'use strict';

const getParties = `
  select p.*
  from import."NALD_PARTIES" p
  where p."ID" = $1 and "FGAC_REGION_CODE" = $2;
`;

const getPartyContacts = `
  select c.*, row_to_json(a.*) AS party_address
  from import."NALD_CONTACTS" c
    left join import."NALD_ADDRESSES" a
      on a."ID" = c."AADD_ID"
  where c."APAR_ID" = $1
  and c."FGAC_REGION_CODE" = $2
  and a."FGAC_REGION_CODE" = $2;
`;

const getParty = `
  select p.*
  from import."NALD_PARTIES" p
  where "ID" = $1 and "FGAC_REGION_CODE" = $2;
`;

exports.getParties = getParties;
exports.getPartyContacts = getPartyContacts;
exports.getParty = getParty;
