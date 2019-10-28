// @TODO
// - get list of licences
// - import each licence individually
// - write data to target tables

const mappers = require('./mappers');
const connectors = require('./connectors');
const { get, flatMap } = require('lodash');

// const getParties = licenceVersionData => {
//   const ids = mappers.document.mapPartyIds(licenceVersionData);
//   const regionCode = get(licenceVersionData, '[0].FGAC_REGION_CODE');
//   const tasks = ids.map(id => connectors.import.getParty(regionCode, id));
//   return Promise.all(tasks);
// };

// const getAddresses = licenceVersionData => {
//   const ids = mappers.document.mapAddressIds(licenceVersionData);
//   const regionCode = get(licenceVersionData, '[0].FGAC_REGION_CODE');
//   const tasks = ids.map(id => connectors.import.getAddress(regionCode, id));
//   return Promise.all(tasks);
// };

const omitNald = licence => {
  delete licence._nald;
  licence.documents.forEach(doc => {
    delete doc._nald;
    doc.roles.forEach(role => {
      if (role.company) {
        delete role.company._nald;
      }
      if (role.address) {
        delete role.address._nald;
      }
      if (role.contact) {
        delete role.contact._nald;
      }
    });
  });
  return licence;
};

const getContext = async () => {
  // Get all parties/addresses
  const arr = await Promise.all([
    connectors.import.getAllParties(),
    connectors.import.getAllAddresses()
  ]);
  return {
    parties: mappers.party.mapParties(arr[0]),
    addresses: mappers.address.mapAddresses(arr[1])
  };
};

const getLicenceData = async licenceNumber => {
  const licence = await connectors.import.getLicence(licenceNumber);
  const { ID: id, FGAC_REGION_CODE: regionCode } = licence;

  const [versions, chargeVersions, tptAgreements, accountAgreements] = await Promise.all([
    connectors.import.getLicenceVersions(regionCode, id),
    connectors.import.getChargeVersions(regionCode, id),
    connectors.import.getTwoPartTariffAgreements(regionCode, id),
    connectors.import.getAccountAgreements(regionCode, id)
  ]);

  return {
    licence,
    versions,
    chargeVersions,
    tptAgreements,
    accountAgreements
  };
};

const importLicence = async licenceNumber => {
  const context = await getContext();
  const licenceData = await getLicenceData(licenceNumber);

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

  // Two-part tariff agreements - section 127/130
  licence.agreements = mappers.agreement.mapAgreements(licenceData.tptAgreements, licenceData.accountAgreements);

  const finalLicence = omitNald(licence);
  console.log(JSON.stringify(finalLicence, null, 2));
};

const run = async () => {
  try {
    await importLicence('');
  } catch (err) {
    console.error(err);
  }
};

run();
