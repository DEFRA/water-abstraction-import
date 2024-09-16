'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (regionCode, partyId) {
  const licenceVersions = await _licenceVersions(regionCode, partyId)
  const licenceRoles = await _licenceRoles(regionCode, partyId)

  const addressIds = _addressIds(licenceVersions, licenceRoles)

  const addresses = await _addresses(regionCode, addressIds)

  return { addresses, licenceVersions, licenceRoles }
}

function _addressIds (licenceVersions, licenceRoles) {
  const allAddressIds = []

  licenceVersions.forEach((record) => {
    allAddressIds.push(record.ACON_AADD_ID)
  })

  licenceRoles.forEach((record) => {
    allAddressIds.push(record.ACON_AADD_ID)
  })

  // Creates a distinct array of address IDs
  return [...new Set(allAddressIds)]
}

async function _addresses (regionCode, addressIds) {
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
      AND "ID" = ANY (string_to_array($2, ',')::TEXT[]);
  `

  return db.query(query, [regionCode, addressIds.join(',')])
}

async function _licenceRoles (regionCode, partyId) {
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

  return db.query(query, [regionCode, partyId])
}

async function _licenceVersions (regionCode, partyId) {
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
      AND lv."STATUS" <> 'DRAFT';
  `

  return db.query(query, [regionCode, partyId])
}

module.exports = {
  go
}
