'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (licence) {
  const { FGAC_REGION_CODE: regionCode, ID: id } = licence

  const licenceVersions = await _licenceVersions(id, regionCode)
  const licenceVersionParties = await _licenceVersionParties(licenceVersions, regionCode)
  const licenceVersionPartyContacts = await _licenceVersionPartyContacts(licenceVersionParties, regionCode)

  _assignPartyDataToLicenceVersions(licenceVersions, licenceVersionParties, licenceVersionPartyContacts)

  return licenceVersions
}

function _assignPartyDataToLicenceVersions (licenceVersions, licenceVersionParties, licenceVersionPartyContacts) {
  for (const party of licenceVersionParties) {
    party.contacts = licenceVersionPartyContacts.filter((contact) => {
      return contact.APAR_ID === party.ID
    })
  }

  for (const version of licenceVersions) {
    version.parties = licenceVersionParties.filter((party) => {
      return party.ID === version.ACON_APAR_ID
    })
  }
}

async function _licenceVersions (id, regionCode) {
  const params = [id, regionCode]
  const query = `
    SELECT
      *
    FROM
      "import"."NALD_ABS_LIC_VERSIONS"
    WHERE
      "AABL_ID" = $1
      AND "FGAC_REGION_CODE" = $2
    ORDER BY "EFF_ST_DATE" ASC;
  `

  return db.query(query, params)
}

async function _licenceVersionParties (licenceVersions, regionCode) {
  const allLicenceVersionPartyIds = licenceVersions.map((licenceVersion) => {
    return licenceVersion.ACON_APAR_ID
  })

  const params = [regionCode, [...new Set(allLicenceVersionPartyIds)]]
  const query = `
    SELECT
      *
    FROM
      "import"."NALD_PARTIES"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "ID" = ANY ($2);
  `

  return db.query(query, params)
}

async function _licenceVersionPartyContacts (licenceVersionParties, regionCode) {
  const allLicenceVersionPartyContactIds = licenceVersionParties.map((licenceVersionParty) => {
    return licenceVersionParty.ID
  })

  const params = [regionCode, [...new Set(allLicenceVersionPartyContactIds)]]
  const query = `
    SELECT
      c.*, row_to_json(a.*) AS party_address
    FROM
      "import"."NALD_CONTACTS" c
    LEFT JOIN
      "import"."NALD_ADDRESSES" a ON a."ID" = c."AADD_ID" AND a."FGAC_REGION_CODE" = c."FGAC_REGION_CODE"
    WHERE
      c."FGAC_REGION_CODE" = $1
      AND c."APAR_ID" = ANY ($2);
  `

  return db.query(query, params)
}

module.exports = {
  go
}
