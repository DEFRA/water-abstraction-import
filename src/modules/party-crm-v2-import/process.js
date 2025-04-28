'use strict'

const db = require('../../lib/connectors/db.js')
const Extract = require('./lib/extract.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const Transformer = require('./lib/transformer.js')

async function go (party, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const { addresses, licenceRoles, licenceVersions } = await Extract.go(party.FGAC_REGION_CODE, party.ID)

    const transformedPartyData = Transformer.go(party, licenceVersions, licenceRoles, addresses)

    await _persistCompany(transformedPartyData)
    await _persistAddresses(transformedPartyData)
    await _persistLicenceHolderContact(transformedPartyData.licenceHolderContact)
    await _persistCompanyContact(transformedPartyData)
    await _persistCompanyAddresses(transformedPartyData)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'party-crm-v2-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('party-crm-v2-import: errored', { party }, error)

    messages.push(error.message)
  }

  return messages
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

  return db.query(query, params)
}

async function _persistAddresses (transformedPartyData) {
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

async function _persistCompany (transformedPartyData) {
  const params = [transformedPartyData.name, transformedPartyData.type, transformedPartyData.externalId]
  const query = `
    INSERT INTO crm_v2.companies (
      name,
      type,
      external_id,
      date_created,
      date_updated,
      current_hash
    )
  VALUES (
    $1,
    $2,
    $3,
    NOW(),
    NOW(),
    md5(
      CONCAT(
        $1::varchar,
        $2::varchar
      )::varchar
    )
  )
  ON CONFLICT (external_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    date_updated = EXCLUDED.date_updated,
    TYPE = EXCLUDED.type,
    last_hash = EXCLUDED.current_hash,
    current_hash = md5(
      CONCAT(
        EXCLUDED.name::varchar,
        EXCLUDED.type::varchar
      )::varchar
    );
  `

  return db.query(query, params)
}

async function _persistCompanyAddress (roleAddress, companyExternalId) {
  const params = [companyExternalId, roleAddress.address.externalId, roleAddress.role, roleAddress.startDate, roleAddress.endDate]
  const query = `
    INSERT INTO crm_v2.company_addresses (
      company_id,
      address_id,
      role_id,
      start_date,
      end_date,
      is_default,
      date_created,
      date_updated
    )
    SELECT
      c.company_id,
      a.address_id,
      r.role_id,
      $4,
      $5,
      TRUE,
      NOW(),
      NOW()
    FROM
      crm_v2.companies c
    JOIN crm_v2.addresses a
      ON a.external_id = $2
    JOIN crm_v2.roles r
      ON r.name = $3
    WHERE
      c.external_id = $1
    ON CONFLICT (
      company_id,
      address_id,
      role_id
    ) DO UPDATE
    SET
      address_id = EXCLUDED.address_id,
      is_default = EXCLUDED.is_default,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
  `

  return db.query(query, params)
}

async function _persistCompanyAddresses (transformedPartyData) {
  for (const roleAddress of transformedPartyData.roleAddresses) {
    await _persistCompanyAddress(roleAddress, transformedPartyData.externalId)
  }
}

async function _persistCompanyContact (transformedPartyData) {
  if (!transformedPartyData.licenceHolderContact) {
    return null
  }

  const { externalId, licenceHolderContact } = transformedPartyData
  const params = [
    externalId,
    licenceHolderContact.contact.externalId,
    licenceHolderContact.role,
    licenceHolderContact.startDate,
    licenceHolderContact.endDate
  ]
  const query = `
    INSERT INTO crm_v2.company_contacts (
      company_id,
      contact_id,
      role_id,
      start_date,
      end_date,
      is_default,
      date_created,
      date_updated
    )
    SELECT
      c.company_id,
      o.contact_id,
      r.role_id,
      $4,
      $5,
      TRUE,
      NOW(),
      NOW()
    FROM
      crm_v2.companies c
    JOIN crm_v2.contacts o
      ON o.external_id = $2
    JOIN crm_v2.roles r
      ON r.name = $3
    WHERE
      c.external_id = $1
    ON CONFLICT (
      company_id,
      contact_id,
      role_id,
      start_date
    ) DO UPDATE
    SET
      contact_id = EXCLUDED.contact_id,
      is_default = EXCLUDED.is_default,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
  `

  return db.query(query, params)
}

async function _persistLicenceHolderContact (licenceHolderContact) {
  if (!licenceHolderContact) {
    return null
  }

  const { externalId, firstName, initials, lastName, salutation } = licenceHolderContact.contact
  const params = [salutation, initials, firstName, lastName, externalId]
  const query = `
    INSERT INTO crm_v2.contacts (
      salutation,
      initials,
      first_name,
      last_name,
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
      'nald',
      NOW(),
      NOW(),
      md5(
        CONCAT(
          $1::varchar,
          $3::varchar,
          $4::varchar
        )::varchar
      )
    ) ON CONFLICT (external_id) DO UPDATE
    SET
      salutation = EXCLUDED.salutation,
      initials = EXCLUDED.initials,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      external_id = EXCLUDED.external_id,
      date_updated = EXCLUDED.date_updated,
      last_hash = EXCLUDED.current_hash,
      current_hash = md5(
        CONCAT(
          EXCLUDED.salutation::varchar,
          EXCLUDED.first_name::varchar,
          EXCLUDED.last_name::varchar
        )::varchar
      );
  `

  return db.query(query, params)
}

module.exports = {
  go
}
