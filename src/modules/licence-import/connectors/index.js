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

exports.getContextData = getContextData;
exports.getLicenceData = getLicenceData;
