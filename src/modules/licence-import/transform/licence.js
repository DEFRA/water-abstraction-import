'use strict'

const mappers = require('./mappers')

const mapContactData = data => ({
  parties: mappers.party.mapParties(data.parties),
  addresses: mappers.address.mapAddresses(data.addresses)
})

/**
 * Gets the CRM v2 licence model from data in the import database
 * @param {String} licenceNumber - The licence to load
 * @return {Promise<Object>} - the CRM v2 licence model
 */
const transformLicence = licenceData => {
  // Get licence
  const licence = mappers.licence.mapLicence(licenceData.licence, licenceData.versions)
  const purposes = licenceData.purposes.map(mappers.licencePurpose.mapLicencePurpose)
  const conditions = licenceData.conditions.map(mappers.purposeCondition.mapPurposeConditionFromNALD)

  // Get documents
  licence.document = mappers.document.mapLicenceToDocument(licence)

  // Get party/address data
  const context = mapContactData(licenceData)

  // Get licence holder/billing document roles
  licence.document.roles = [
    ...mappers.role.mapLicenceHolderRoles(licence.document, licenceData.versions, context),
    ...mappers.role.mapLicenceRoles(licenceData.roles, context)
  ]

  // Agreements - section 127/130
  licence.agreements = mappers.agreement.mapAgreements(licenceData.tptAgreements, licenceData.section130Agreements)

  licence.versions = licenceData.versions.map(version => {
    return mappers.licenceVersion.mapLicenceVersion(version, purposes, conditions)
  })

  const finalLicence = mappers.licence.omitNaldData(licence)

  return finalLicence
}

module.exports = {
  transformLicence
}
