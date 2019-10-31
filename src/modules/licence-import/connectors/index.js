const importConnector = require('./import');

const getContextData = async () => {
  // Get all parties/addresses
  const [parties, addresses] = await Promise.all([
    importConnector.getAllParties(),
    importConnector.getAllAddresses()
  ]);
  return { parties, addresses };
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

  return {
    licence,
    versions,
    chargeVersions,
    tptAgreements,
    section130Agreements
  };
};

const getCompanyData = async (regionCode, partyId) => {
  const [invoiceAccounts, licenceVersions] = await Promise.all([
    importConnector.getInvoiceAccounts(regionCode, partyId),
    importConnector.getPartyLicenceVersions(regionCode, partyId)
  ]);
  return {
    invoiceAccounts,
    licenceVersions
  };
};

exports.getContextData = getContextData;
exports.getLicenceData = getLicenceData;
exports.getCompanyData = getCompanyData;
