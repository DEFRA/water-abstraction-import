const { pool } = require('../../../../lib/connectors/db')
const queries = require('./queries')

const createDocument = async doc => {
  const params = [doc.documentRef, doc.startDate, doc.endDate, doc.externalId]
  return pool.query(queries.createDocument, params)
}

const createDocumentRole = async (doc, role) => {
  const companyExternalId = role?.company?.externalId ?? null
  const contactExternalId = role?.contact?.externalId ?? null
  const adressExternalId = role?.address?.externalId ?? null
  const invoiceAccountNumber = role?.invoiceAccount?.invoiceAccountNumber ?? null

  const params = [doc.documentRef, role.role, companyExternalId,
    contactExternalId, adressExternalId, invoiceAccountNumber, role.startDate, role.endDate]
  return pool.query(queries.createDocumentRole, params)
}

const createCompany = company => {
  const params = [company.name, company.type, company.externalId]
  return pool.query(queries.createCompany, params)
}

const createAddress = address => {
  const params = [address.address1, address.address2, address.address3, address.address4,
    address.town, address.county, address.postcode, address.country, address.externalId]
  return pool.query(queries.createAddress, params)
}

const createContact = contact => {
  const params = [contact.salutation, contact.initials, contact.firstName, contact.lastName, contact.externalId]
  return pool.query(queries.createContact, params)
}

const createInvoiceAccount = (company, invoiceAccount) => {
  const params = [invoiceAccount.invoiceAccountNumber, invoiceAccount.startDate, invoiceAccount.endDate, company.externalId]
  return pool.query(queries.createInvoiceAccount, params)
}

const createInvoiceAccountAddress = (invoiceAccount, invoiceAccountAddress) => {
  const invoiceAccountAddressExternalId = invoiceAccountAddress?.agentCompany?.externalId ?? null
  const params = [
    invoiceAccount.invoiceAccountNumber,
    invoiceAccountAddress.address.externalId,
    invoiceAccountAddress.startDate,
    invoiceAccountAddress.endDate,
    invoiceAccountAddressExternalId
  ]
  return pool.query(queries.createInvoiceAccountAddress, params)
}

const createCompanyContact = (company, contact) => {
  const params = [company.externalId, contact.contact.externalId, contact.role, contact.startDate, contact.endDate]
  return pool.query(queries.createCompanyContact, params)
}

const createCompanyAddress = (company, address) => {
  const params = [company.externalId, address.address.externalId, address.role, address.startDate, address.endDate]
  return pool.query(queries.createCompanyAddress, params)
}

const createAgreement = (licence, agreement) => {
  const params = [licence.licenceNumber, agreement.agreementCode, agreement.startDate, agreement.endDate]
  return pool.query(queries.createAgreement, params)
}

const createLicenceVersion = async (version, licenceId) => {
  const params = [
    licenceId,
    version.issue,
    version.increment,
    version.status,
    version.startDate,
    version.endDate,
    version.externalId
  ]

  const result = await pool.query(queries.createLicenceVersion, params)
  return result.rows[0]
}

const createLicence = async licence => {
  const result = await pool.query(queries.createLicence, [
    licence.regionCode,
    licence.licenceNumber,
    licence.isWaterUndertaker,
    licence.regions,
    licence.startDate,
    licence.expiredDate,
    licence.lapsedDate,
    licence.revokedDate
  ])

  return result.rows[0]
}

const createLicenceVersionPurpose = async (purpose, licenceVersionId) => {
  const params = [
    licenceVersionId,
    purpose.purposePrimary,
    purpose.purposeSecondary,
    purpose.purposeUse,
    purpose.abstractionPeriodStartDay,
    purpose.abstractionPeriodStartMonth,
    purpose.abstractionPeriodEndDay,
    purpose.abstractionPeriodEndMonth,
    purpose.timeLimitedStartDate,
    purpose.timeLimitedEndDate,
    purpose.notes,
    purpose.instantQuantity,
    purpose.hourlyQuantity,
    purpose.dailyQuantity,
    purpose.annualQuantity,
    purpose.externalId
  ]
  const result = await pool.query(queries.createLicenceVersionPurpose, params)
  return result.rows[0]
}

const getLicenceByRef = async licenceRef => {
  const result = await pool.query(queries.getLicenceByRef, [licenceRef])
  return result.rows[0]
}

const flagLicenceForSupplementaryBilling = async licenceId => pool.query(queries.flagLicenceForSupplementaryBilling, [licenceId])

const cleanUpAgreements = licence => {
  // Create keys for the agreements we wish to keep
  const keys = licence.agreements.map(agreement =>
    `${agreement.agreementCode}:${agreement.startDate}`)

  return pool.query(queries.cleanUpAgreements, [licence.licenceNumber, keys])
}

const createPurposeConditionTypes = async () => pool.query(queries.createPurposeConditionTypes)

const createPurposeCondition = (condition, purposeId) =>
  pool.query(queries.createPurposeCondition, [
    purposeId,
    condition.code,
    condition.subcode,
    condition.param1,
    condition.param2,
    condition.notes,
    condition.externalId
  ])

module.exports = {
  createPurposeCondition,
  createPurposeConditionTypes,
  createAddress,
  createAgreement,
  createCompany,
  createCompanyAddress,
  createCompanyContact,
  createContact,
  createDocument,
  createDocumentRole,
  createInvoiceAccount,
  createInvoiceAccountAddress,
  createLicence,
  createLicenceVersion,
  createLicenceVersionPurpose,
  getLicenceByRef,
  flagLicenceForSupplementaryBilling,
  cleanUpAgreements
}
