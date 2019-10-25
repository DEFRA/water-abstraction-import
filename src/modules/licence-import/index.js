// @TODO
// - get list of licences
// - import each licence individually
// - write data to target tables

const mappers = require('./mappers');
const connectors = require('./connectors');
const { get, omit } = require('lodash');
const traverse = require('traverse');

const getParties = licenceVersionData => {
  const ids = mappers.document.mapPartyIds(licenceVersionData);
  const regionCode = get(licenceVersionData, '[0].FGAC_REGION_CODE');
  const tasks = ids.map(id => connectors.import.getParty(regionCode, id));
  return Promise.all(tasks);
};

const getAddresses = licenceVersionData => {
  const ids = mappers.document.mapAddressIds(licenceVersionData);
  const regionCode = get(licenceVersionData, '[0].FGAC_REGION_CODE');
  const tasks = ids.map(id => connectors.import.getAddress(regionCode, id));
  return Promise.all(tasks);
};

const omitNald = licence => {
  delete licence._nald;
  licence.documents.forEach(doc => {
    delete doc._nald;
    doc.roles.forEach(role => {
      delete role.company._nald;
      delete role.address._nald;
      if (role.contact) {
        delete role.contact._nald;
      }
    });
  });
  return licence;
};

const importLicence = async licenceNumber => {
  // Get all parties/addresses
  const arr = await Promise.all([
    connectors.import.getAllParties(),
    connectors.import.getAllAddresses()
  ]);
  const context = {
    parties: mappers.party.mapParties(arr[0]),
    addresses: mappers.address.mapAddresses(arr[1])
  };

  // Get licence
  const licenceData = await connectors.import.getLicence(licenceNumber);
  const licence = mappers.licence.mapLicence(licenceData);

  // Get documents
  const licenceVersionData = await connectors.import.getLicenceVersions(licenceData.FGAC_REGION_CODE, licenceData.ID);
  licence.documents = mappers.document.mapDocuments(licenceVersionData, licence);
  licence.documents = licence.documents.map(doc => mappers.role.mapLicenceHolderRoles(doc, context));

  // @TOOO billing roles
  const chargeVersions = await connectors.import.getChargeVersions(licenceData.FGAC_REGION_CODE, licenceData.ID);
  licence.documents = licence.documents.map(doc => mappers.role.mapBillingRoles(doc, chargeVersions, context));

  // console.log(chargeVersions);

  // @TODO S127 / S130 agreements

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
