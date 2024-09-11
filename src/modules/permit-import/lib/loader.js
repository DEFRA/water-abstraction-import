'use strict'

const { v4: uuidV4 } = require('uuid')

const { pool } = require('../../../lib/connectors/db.js')
const Repository = require('../../../lib/repository.js')
const { buildCRMPacket } = require('./transform-crm')
const { getLicenceJson, buildPermitRepoPacket } = require('./transform-permit')

async function _loadDocumentHeader (licenceNumber, licenceData, permitRepoId) {
  const crmData = buildCRMPacket(licenceData, licenceNumber, permitRepoId)

  // Legacy madness! please don't ask us why someone built this and only used it for importing a few tables
  const repository = new Repository(
    pool,
    {
      table: 'crm.document_header',
      upsert: {
        fields: ['system_id', 'system_internal_id', 'regime_entity_id'],
        set: ['system_external_id', 'metadata']
      }
    }
  )

  return repository.persist({ document_id: uuidV4(), ...crmData })
}

async function _loadPermit (licenceNumber, licenceData) {
  const permit = buildPermitRepoPacket(licenceNumber, 1, 8, licenceData)

  // Legacy madness! please don't ask us why someone built this and only used it for importing a few tables
  const repository = new Repository(
    pool,
    {
      table: 'permit.licence',
      upsert: {
        fields: ['licence_regime_id', 'licence_type_id', 'licence_ref'],
        set: ['licence_status_id', 'licence_search_key', 'is_public_domain', 'licence_start_dt', 'licence_end_dt', 'licence_data_value']
      }
    }
  )

  const { rows: [{ licence_id: permitRepoId }] } = await repository.persist(permit, ['licence_id'])

  return permitRepoId
}

async function load (licenceNumber) {
  const licenceData = await getLicenceJson(licenceNumber)

  if (licenceData.data.versions.length === 0) {
    return null
  }

  const permitRepoId = await _loadPermit(licenceNumber, licenceData)

  return _loadDocumentHeader(licenceNumber, licenceData, permitRepoId)
}

module.exports = {
  load
}
