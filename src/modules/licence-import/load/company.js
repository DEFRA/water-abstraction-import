const { uniqBy } = require('lodash');
const connectors = require('./connectors');

const getAddresses = company => {
  const companyAddresses = company.addresses.map(row => row.address);

  const invoiceAccountAddresses = company.invoiceAccounts.reduce((acc, invoiceAccount) => {
    const addresses = invoiceAccount.addresses.map(row => row.address);
    return [...acc, ...addresses];
  }, []);

  const addresses = [
    ...companyAddresses,
    ...invoiceAccountAddresses
  ];
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
  const entities = Promise.all([
    connectors.createCompany(company),
    loadAddresses(company),
    loadContacts(company)
  ]);

  const relationships = Promise.all([
    loadInvoiceAccounts(company),
    loadCompanyContacts(company),
    loadCompanyAddresses(company)
  ]);

  return Promise.all([entities, relationships]);
};

exports.loadCompany = loadCompany;
