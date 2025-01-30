'use strict'

/**
 * Code for loading imported data to the target database(s)
 */
const { v4: uuidV4 } = require('uuid')
const { buildCRMPacket } = require('./transform-crm')
const { buildReturnsPacket } = require('./transform-returns')
const { getLicenceJson, buildPermitRepoPacket } = require('./transform-permit')
const returnsConnector = require('../../lib/connectors/returns')
const { persistReturns } = require('./lib/persist-returns')

const repository = require('./repositories')

const { featureFlags } = require('../../../config.js')

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
 * Calculates and imports a list of return cycles for the given licence
 * based on NALD formats and form logs
 * @param {String} licenceNumber
 * @param {Boolean} replicateReturns
 * @return {Promise} resolves when returns imported
 */
const loadReturns = async (licenceNumber, replicateReturns) => {
  const { returns } = await buildReturnsPacket(licenceNumber)
  await persistReturns(returns, replicateReturns)

  // Clean up invalid cycles
  const returnIds = returns.map(row => row.return_id)
  await returnsConnector.voidReturns(licenceNumber, returnIds)
}

/**
 * Imports the whole licence
 * @param {String} licenceNumber
 * @param {Boolean} replicateReturns
 * @return {Promise} resolves when complete
 */
const load = async (licenceNumber, replicateReturns) => {
  const licenceData = await getLicenceJson(licenceNumber)

  if (licenceData.data.versions.length > 0) {
    await loadPermitAndDocumentHeader(licenceNumber, licenceData)

    if (!featureFlags.disableReturnsImports) {
      await loadReturns(licenceNumber, replicateReturns)
    }
  }
}

module.exports = {
  load
}
