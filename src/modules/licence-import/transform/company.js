/**
 * Loads the CRM v2 data model for a given licence from NALD data in the database,
 * ready to store in service tables
 * @TODO
 * - write data to target tables
 */
const mappers = require('./mappers');

const mapContactData = data => ({
  parties: mappers.party.mapParties([data.party]),
  addresses: mappers.address.mapAddresses(data.addresses)
});

const transformCompany = companyData => {
  const contact = mappers.contact.mapContact(companyData.party);
  const company = mappers.company.mapCompany(companyData.party);

  const context = mapContactData(companyData);

  company.invoiceAccounts = mappers.invoiceAccount.mapInvoiceAccounts(companyData.invoiceAccounts, context);
  company.addresses = mappers.companyAddress.mapCompanyAddresses(companyData.licenceVersions, companyData.invoiceAccounts, context);
  company.contacts = mappers.companyContact.mapCompanyContacts(contact, companyData.licenceVersions, companyData.invoiceAccounts);

  return mappers.licence.omitNaldData(company);
};

exports.transformCompany = transformCompany;
