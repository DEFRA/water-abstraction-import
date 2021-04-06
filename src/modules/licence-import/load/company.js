const { uniqBy } = require('lodash');
const connectors = require('./connectors');
const config = require('../../../../config');

const getAddresses = company => {
  const companyAddresses = company.addresses.map(row => row.address);

  const invoiceAccountAddresses = company.invoiceAccounts.reduce((acc, invoiceAccount) => {
    const addresses = invoiceAccount.addresses.map(row => row.address);
    return [...acc, ...addresses];
  }, []);

  // Allow import of invoice accounts to be disabled for charging go live
  const addresses = config.import.licences.isInvoiceAccountImportEnabled
    ? [...companyAddresses, ...invoiceAccountAddresses]
    : companyAddresses;

  return uniqBy(addresses, row => row.externalId);
};

const loadAddresses = async company => {
  const addresses = getAddresses(company);
  const tasks = addresses.map(connectors.createAddress);
  return Promise.all(tasks);
};

const loadContacts = async company => {
  const contacts = company.contacts.map(row => row.contact);
  const tasks = contacts.map(connectors.createContact);
  return Promise.all(tasks);
};

const loadInvoiceAccount = async (company, invoiceAccount) => {
  await connectors.createInvoiceAccount(company, invoiceAccount);
  const tasks = invoiceAccount.addresses.map(address =>
    connectors.createInvoiceAccountAddress(invoiceAccount, address)
  );
  return Promise.all(tasks);
};

const loadInvoiceAccounts = async company => {
  // Allow import of invoice accounts to be disabled for charging go live
  if (!config.import.licences.isInvoiceAccountImportEnabled) {
    return [];
  }

  const tasks = company.invoiceAccounts.map(invoiceAccount =>
    loadInvoiceAccount(company, invoiceAccount)
  );
  return Promise.all(tasks);
};

const loadCompanyContacts = async company => {
  const tasks = company.contacts.map(contact =>
    connectors.createCompanyContact(company, contact)
  );
  return Promise.all(tasks);
};

const loadCompanyAddresses = async company => {
  const tasks = company.addresses.map(address => {
    connectors.createCompanyAddress(company, address);
  });
  return Promise.all(tasks);
};

const loadCompany = async company => {
  const entities = await Promise.all([
    connectors.createCompany(company),
    loadAddresses(company),
    loadContacts(company)
  ]);

  const relationships = await Promise.all([
    loadInvoiceAccounts(company),
    loadCompanyContacts(company),
    loadCompanyAddresses(company)
  ]);

  return { entities, relationships };
};

exports.loadCompany = loadCompany;
