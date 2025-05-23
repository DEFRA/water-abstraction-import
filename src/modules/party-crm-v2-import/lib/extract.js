'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode, partyId) {
  const licenceVersions = await _licenceVersions(regionCode, partyId)
  const licenceRoles = await _licenceRoles(regionCode, partyId)

  const addresses = await _addresses(regionCode, licenceVersions, licenceRoles)

  return { addresses, licenceRoles, licenceVersions }
}

async function _addresses (regionCode, licenceVersions, licenceRoles) {
  const allAddressIds = []

  for (const licenceVersion of licenceVersions) {
    allAddressIds.push(licenceVersion.ACON_AADD_ID)
  }

  for (const licenceRole of licenceRoles) {
    allAddressIds.push(licenceRole.ACON_AADD_ID)
  }

  const params = [regionCode, [...new Set(allAddressIds)]]
  const query = `
    SELECT
      "ID",
      "ADDR_LINE1",
      "ADDR_LINE2",
      "ADDR_LINE3",
      "ADDR_LINE4",
      "TOWN",
      "COUNTY",
      "POSTCODE",
      "COUNTRY",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_ADDRESSES"
    WHERE
      "FGAC_REGION_CODE" = $1
      AND "ID" = ANY ($2);
  `

  return db.query(query, params)
}

async function _licenceRoles (regionCode, partyId) {
  const params = [regionCode, partyId]
  const query = `
    SELECT
      "ID",
      "ALRT_CODE",
      "ACON_APAR_ID",
      "ACON_AADD_ID",
      "EFF_ST_DATE",
      "EFF_END_DATE",
      "FGAC_REGION_CODE"
    FROM
      "import"."NALD_LIC_ROLES"
    WHERE
      "FGAC_REGION_CODE"=$1
      AND "ACON_APAR_ID"=$2;
  `

  return db.query(query, params)
}

async function _licenceVersions (regionCode, partyId) {
  const params = [regionCode, partyId]
  const query = `
    SELECT
      lv."AABL_ID",
      lv."EFF_ST_DATE",
      lv."ACON_APAR_ID",
      lv."ACON_AADD_ID",
      lv."EFF_END_DATE",
      lv."FGAC_REGION_CODE",
      l."REV_DATE",
      l."LAPSED_DATE",
      l."EXPIRY_DATE"
    FROM
      "import"."NALD_ABS_LIC_VERSIONS" lv
    JOIN "import"."NALD_ABS_LICENCES" l ON
      lv."AABL_ID" = l."ID"
      AND lv."FGAC_REGION_CODE" = l."FGAC_REGION_CODE"
    WHERE
      lv."FGAC_REGION_CODE" = $1
      AND lv."ACON_APAR_ID" = $2
      AND lv."STATUS" <> 'DRAFT'
    ORDER BY to_date(lv."EFF_ST_DATE", 'DD/MM/YYYY') ASC;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
