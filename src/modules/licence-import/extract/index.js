const importConnector = require('./connectors');

const getLicenceParties = (regionCode, versions, chargeVersions) => {
  const partyIds = [
    ...versions.map(row => row.ACON_APAR_ID),
    ...chargeVersions.map(row => row.ACON_APAR_ID)
  ];
  return importConnector.getParties(regionCode, partyIds);
};

const getLicenceAddresses = (regionCode, versions, chargeVersions) => {
  const addressIds = [
    ...versions.map(row => row.ACON_AADD_ID),
    ...chargeVersions.map(row => row.ACON_AADD_ID)
  ];
  return importConnector.getAddresses(regionCode, addressIds);
};

const getLicenceData = async licenceNumber => {
  const licence = await importConnector.getLicence(licenceNumber);
  const { ID: id, FGAC_REGION_CODE: regionCode } = licence;

  const [versions, chargeVersions, tptAgreements, section130Agreements] = await Promise.all([
    importConnector.getLicenceVersions(regionCode, id),
    importConnector.getChargeVersions(regionCode, id),
    importConnector.getTwoPartTariffAgreements(regionCode, id),
    importConnector.getSection130Agreements(regionCode, id)
  ]);

  const [parties, addresses] = await Promise.all([
    getLicenceParties(regionCode, versions, chargeVersions),
    getLicenceAddresses(regionCode, versions, chargeVersions)
  ]);

  return {
    licence,
    versions,
    chargeVersions,
    tptAgreements,
    section130Agreements,
    parties,
    addresses
  };
};

const getCompanyAddresses = (regionCode, versions, invoiceAccounts) => {
  const addressIds = [
    ...versions.map(row => row.ACON_AADD_ID),
    ...invoiceAccounts.map(row => row.ACON_AADD_ID)
  ];
  return importConnector.getAddresses(regionCode, addressIds);
};

const getCompanyData = async (regionCode, partyId) => {
  const [party, invoiceAccounts, licenceVersions] = await Promise.all([
    importConnector.getParty(regionCode, partyId),
    importConnector.getInvoiceAccounts(regionCode, partyId),
    importConnector.getPartyLicenceVersions(regionCode, partyId)
  ]);

  const addresses = await getCompanyAddresses(regionCode, licenceVersions, invoiceAccounts);

  return {
    party,
    addresses,
    invoiceAccounts,
    licenceVersions
  };
};

exports.getLicenceData = getLicenceData;
exports.getCompanyData = getCompanyData;
exports.getAllParties = importConnector.getAllParties;
exports.getAllLicenceNumbers = importConnector.getAllLicenceNumbers;
