'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')
const { buildCRMPacket } = require('./transform-crm')
const { getLicenceJson, buildPermitRepoPacket } = require('./transform-permit')

async function load (licenceNumber) {
  const licenceData = await getLicenceJson(licenceNumber)

  if (licenceData.data.versions.length === 0) {
    return null
  }

  const permitRepoId = await _loadPermit(licenceNumber, licenceData)

  return _loadDocumentHeader(licenceNumber, licenceData, permitRepoId)
}

async function _loadDocumentHeader (licenceNumber, licenceData, permitRepoId) {
  const crmData = buildCRMPacket(licenceData, licenceNumber, permitRepoId)

  return _persistDocumentHeader(crmData)
}

async function _loadPermit (licenceNumber, licenceData) {
  const permit = buildPermitRepoPacket(licenceNumber, 1, 8, licenceData)

  const results = await _persistPermit(permit)

  return results[0].licence_id
}

async function _persistDocumentHeader (documentHeader) {
  const params = [
    generateUUID(),
    documentHeader.regime_entity_id,
    documentHeader.system_id,
    documentHeader.system_internal_id,
    documentHeader.system_external_id,
    documentHeader.metadata
  ]

  const query = `
    INSERT INTO crm.document_header (
      document_id,
      regime_entity_id,
      system_id,
      system_internal_id,
      system_external_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (
      system_id,
      system_internal_id,
      regime_entity_id
    )
    DO UPDATE SET
      system_external_id = EXCLUDED.system_external_id,
      metadata = EXCLUDED.metadata;
  `

  return db.query(query, params)
}

async function _persistPermit (permit) {
  const params = [
    permit.licence_ref,
    permit.licence_start_dt,
    permit.licence_end_dt,
    permit.licence_status_id,
    permit.licence_type_id,
    permit.licence_regime_id,
    permit.licence_data_value
  ]

  const query = `
    INSERT INTO permit.licence (
      licence_ref,
      licence_start_dt,
      licence_end_dt,
      licence_status_id,
      licence_type_id,
      licence_regime_id,
      licence_data_value
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (
      licence_regime_id,
      licence_type_id,
      licence_ref
    ) DO UPDATE SET
      licence_status_id = EXCLUDED.licence_status_id,
      licence_search_key = EXCLUDED.licence_search_key,
      is_public_domain = EXCLUDED.is_public_domain,
      licence_start_dt = EXCLUDED.licence_start_dt,
      licence_end_dt = EXCLUDED.licence_end_dt,
      licence_data_value = EXCLUDED.licence_data_value
    RETURNING licence_id;
  `

  return db.query(query, params)
}

module.exports = {
  load
}
