'use strict'

/**
 * Code for loading imported data to the target database(s)
 */
const { v4: uuidV4 } = require('uuid')
const { buildCRMPacket } = require('./transform-crm')
const { getLicenceJson, buildPermitRepoPacket } = require('./transform-permit')

const repository = require('./repositories')

/**
 * Loads data into the permit repository and CRM doc header
 * @param {String} licenceNumber
 * @param {Object} licenceData - extracted from NALD import tables
 * @return {Promise} resolves when completed
 */
const loadPermitAndDocumentHeader = async (licenceNumber, licenceData) => {
  const permit = buildPermitRepoPacket(licenceNumber, 1, 8, licenceData)
  const { rows: [{ licence_id: permitRepoId }] } = await repository.licence.persist(permit, ['licence_id'])

  // Create CRM data and persist
  const crmData = buildCRMPacket(licenceData, licenceNumber, permitRepoId)
  await repository.document.persist({ document_id: uuidV4(), ...crmData })
}

/**
 * Imports the whole licence
 * @param {String} licenceNumber
 * @return {Promise} resolves when complete
 */
const load = async (licenceNumber) => {
  const licenceData = await getLicenceJson(licenceNumber)

  if (licenceData.data.versions.length > 0) {
    await loadPermitAndDocumentHeader(licenceNumber, licenceData)
  }
}

module.exports = {
  load
}
