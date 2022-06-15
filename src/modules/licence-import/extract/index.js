'use strict';
const { flatMap, uniq } = require('lodash');

const importConnector = require('./connectors');

const getIds = (idProperty, ...args) => {
  const ids = flatMap(args).map(row => row[idProperty]);
  return uniq(ids);
};

const getLicenceParties = (regionCode, versions, chargeVersions, roles) => {
  const partyIds = getIds('ACON_APAR_ID', versions, chargeVersions, roles);
  return importConnector.getParties(regionCode, partyIds);
};

const getLicenceAddresses = (regionCode, versions, chargeVersions, roles) => {
  const addressIds = getIds('ACON_AADD_ID', versions, chargeVersions, roles);
  return importConnector.getAddresses(regionCode, addressIds);
};

const getLicenceData = async licenceNumber => {
  const licence = await importConnector.getLicence(licenceNumber);
  const { ID: id, FGAC_REGION_CODE: regionCode } = licence;

  const [versions, chargeVersions, tptAgreements, section130Agreements, purposes, conditions, roles] = await Promise.all([
    importConnector.getLicenceVersions(regionCode, id),
    importConnector.getChargeVersions(regionCode, id),
    importConnector.getTwoPartTariffAgreements(regionCode, id),
    importConnector.getSection130Agreements(regionCode, id),
    importConnector.getLicencePurposes(regionCode, id),
    importConnector.getPurposeConditions(regionCode, id),
    importConnector.getLicenceRoles(regionCode, id)
  ]);

  const [parties, addresses] = await Promise.all([
    getLicenceParties(regionCode, versions, chargeVersions, roles),
    getLicenceAddresses(regionCode, versions, chargeVersions, roles)
  ]);

  return {
    addresses,
    chargeVersions,
    licence,
    parties,
    purposes,
    conditions,
    section130Agreements,
    tptAgreements,
    versions,
    roles
  };
};

const getCompanyAddresses = (regionCode, ...args) => {
  const addressIds = flatMap(args).map(row => row.ACON_AADD_ID);
  return importConnector.getAddresses(regionCode, uniq(addressIds));
};

const getCompanyData = async (regionCode, partyId) => {
  const [party, invoiceAccounts, licenceVersions, licenceRoles] = await Promise.all([
    importConnector.getParty(regionCode, partyId),
    importConnector.getInvoiceAccounts(regionCode, partyId),
    importConnector.getPartyLicenceVersions(regionCode, partyId),
    importConnector.getPartyLicenceRoles(regionCode, partyId)
  ]);

  const addresses = await getCompanyAddresses(regionCode, licenceVersions, invoiceAccounts, licenceRoles);

  return {
    party,
    addresses,
    invoiceAccounts,
    licenceVersions,
    licenceRoles
  };
};

module.exports = {
  getLicenceData,
  getCompanyData,
  getAllParties: importConnector.getAllParties,
  getAllLicenceNumbers: importConnector.getAllLicenceNumbers
};
