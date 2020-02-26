const { pool } = require('../../../../lib/connectors/db');
const { get } = require('lodash');
const queries = require('./queries');

const createDocument = async doc => {
  const params = [doc.documentRef, doc.versionNumber, doc.status, doc.startDate, doc.endDate, doc.externalId];
  return pool.query(queries.createDocument, params);
};

const createDocumentRole = async (doc, role) => {
  const params = [doc.documentRef, doc.versionNumber, role.role, get(role, 'company.externalId', null),
    get(role, 'contact.externalId', null), get(role, 'address.externalId', null),
    get(role, 'invoiceAccount.invoiceAccountNumber', null), role.startDate, role.endDate];
  return pool.query(queries.createDocumentRole, params);
};

const createCompany = company => {
  const params = [company.name, company.type, company.externalId];
  return pool.query(queries.createCompany, params);
};

const createAddress = address => {
  const params = [address.address1, address.address2, address.address3, address.address4,
    address.town, address.county, address.postcode, address.country, address.externalId];
  return pool.query(queries.createAddress, params);
};

const createContact = contact => {
  const params = [contact.salutation, contact.initials, contact.firstName, contact.lastName, contact.externalId];
  return pool.query(queries.createContact, params);
};

const createInvoiceAccount = (company, invoiceAccount) => {
  const params = [invoiceAccount.invoiceAccountNumber, invoiceAccount.startDate, invoiceAccount.endDate, company.externalId];
  return pool.query(queries.createInvoiceAccount, params);
};

const createInvoiceAccountAddress = (invoiceAccount, invoiceAccountAddress) => {
  const params = [invoiceAccount.invoiceAccountNumber, invoiceAccountAddress.address.externalId, invoiceAccountAddress.startDate, invoiceAccountAddress.endDate];
  return pool.query(queries.createInvoiceAccountAddress, params);
};

const createCompanyContact = (company, contact) => {
  const params = [company.externalId, contact.contact.externalId, contact.role, contact.startDate, contact.endDate];
  return pool.query(queries.createCompanyContact, params);
};

const createCompanyAddress = (company, address) => {
  const params = [company.externalId, address.address.externalId, address.role, address.startDate, address.endDate];
  return pool.query(queries.createCompanyAddress, params);
};

const createAgreement = (licence, agreement) => {
  const params = [licence.licenceNumber, agreement.agreementCode, agreement.startDate, agreement.endDate];
  return pool.query(queries.createAgreement, params);
};

const createLicence = licence => pool.query(queries.createLicence, [
  licence.regionCode,
  licence.licenceNumber,
  licence.isWaterUndertaker,
  licence.regions,
  licence.startDate,
  licence.expiredDate,
  licence.lapsedDate,
  licence.revokedDate
]);

exports.createDocument = createDocument;
exports.createDocumentRole = createDocumentRole;
exports.createCompany = createCompany;
exports.createAddress = createAddress;
exports.createContact = createContact;
exports.createInvoiceAccount = createInvoiceAccount;
exports.createInvoiceAccountAddress = createInvoiceAccountAddress;
exports.createCompanyContact = createCompanyContact;
exports.createCompanyAddress = createCompanyAddress;
exports.createAgreement = createAgreement;
exports.createLicence = createLicence;
