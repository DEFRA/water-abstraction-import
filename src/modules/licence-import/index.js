/**
 * Loads the CRM v2 data model for a given licence from NALD data in the database,
 * ready to store in service tables
 * @TODO
 * - write data to target tables
 */
const { cloneDeep } = require('lodash');
const mappers = require('./mappers');
const connectors = require('./connectors');

const getContext = async () => {
  // Get all parties/addresses
  const { parties, addresses } = await connectors.getContextData();
  return {
    parties: mappers.party.mapParties(parties),
    addresses: mappers.address.mapAddresses(addresses)
  };
};

/**
 * Gets the CRM v2 licence model from data in the import database
 * @param {String} licenceNumber - The licence to load
 * @param {Object} context - a hash of NALD address/party data keyed by [regionCode][id]
 * @return {Promise<Object>} - the CRM v2 licence model
 */
const importLicence = async (licenceNumber, context) => {
  const licenceData = await connectors.getLicenceData(licenceNumber);

  // Get licence
  const licence = mappers.licence.mapLicence(licenceData.licence);

  // Get documents
  licence.documents = mappers.document.mapDocuments(licenceData.versions, licence);

  // Get licence holder/billing document roles
  licence.documents.forEach(doc => {
    const roles = [
      ...mappers.role.mapLicenceHolderRoles(doc, context),
      ...mappers.role.mapBillingRoles(doc, licenceData.chargeVersions, context)
    ];
    doc.roles.push(...roles);
  });

  // Agreements - section 127/130
  licence.agreements = mappers.agreement.mapAgreements(licenceData.tptAgreements, licenceData.accountAgreements);

  const finalLicence = mappers.licence.omitNaldData(licence);

  return finalLicence;
};

const importCompany = async (regionCode, partyId, context) => {
  const company = cloneDeep(context.parties[regionCode][partyId].company);

  const companyData = await connectors.getCompanyData(regionCode, partyId);

  company.invoiceAccounts = mappers.invoiceAccount.mapInvoiceAccounts(companyData.invoiceAccounts, context);
  company.addresses = mappers.companyAddress.mapCompanyAddresses(companyData.licenceVersions, context);
  company.contacts = mappers.companyContact.mapCompanyContacts(context.parties[regionCode][partyId].contact, companyData.licenceVersions);

  return mappers.licence.omitNaldData(company);
};

exports.getContext = getContext;
exports.importLicence = importLicence;
exports.importCompany = importCompany;
