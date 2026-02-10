'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (transformedPartyData) {
  const allRoleAddresses = transformedPartyData.roleAddresses.map((roleAddress) => {
    return roleAddress.address
  })

  // Create a set () unique list of all the role addresses. The second arg is a function the set will use to uniquely
  // identify each role address. This is because a roleAddress has the following schema
  //
  // {
  //   role: 'licenceHolder',
  //   startDate: '1967-06-01',
  //   endDate: '1967-10-01',
  //   address: { // Address properties }
  // }
  //
  // There might be two role addresses, for example, licence holder and returns to, both of which link to the same
  // address.
  const addressesSet = new Set(
    allRoleAddresses,
    (roleAddress) => {
      return roleAddress.externalId
    }
  )

  const uniqueAddresses = [...addressesSet]

  for (const address of uniqueAddresses) {
    await _persistAddress(address)
  }
}

async function _persistAddress (address) {
  const params = [
    address.address1,
    address.address2,
    address.address3,
    address.address4,
    address.town,
    address.county,
    address.postcode,
    address.country,
    address.externalId
  ]
  const query = `
    INSERT INTO crm_v2.addresses (
      address_1,
      address_2,
      address_3,
      address_4,
      town,
      county,
      postcode,
      country,
      external_id,
      data_source,
      date_created,
      date_updated,
      current_hash
    )
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    'nald',
    NOW(),
    NOW(),
    md5(
      CONCAT(
        $1::varchar,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::varchar,
        $7::varchar
      )::varchar
    )
  ) ON
  CONFLICT (external_id) DO UPDATE
  SET
    address_1 = EXCLUDED.address_1,
    address_2 = EXCLUDED.address_2,
    address_3 = EXCLUDED.address_3,
    address_4 = EXCLUDED.address_4,
    town = EXCLUDED.town,
    county = EXCLUDED.county,
    postcode = EXCLUDED.postcode,
    country = EXCLUDED.country,
    last_hash = EXCLUDED.current_hash,
    current_hash = md5(
      CONCAT(
        EXCLUDED.address_1::varchar,
        EXCLUDED.address_2::varchar,
        EXCLUDED.address_3::varchar,
        EXCLUDED.address_4::varchar,
        EXCLUDED.town::varchar,
        EXCLUDED.county::varchar,
        EXCLUDED.postcode::varchar
      )::varchar
    ),
    date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
