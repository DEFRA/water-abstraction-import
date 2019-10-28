// @TODO
// - get list of licences
// - import each licence individually
// - write data to target tables

const mappers = require('./mappers');
const connectors = require('./connectors');

const getContext = async () => {
  // Get all parties/addresses
  const { parties, addresses } = await connectors.getContextData();
  return {
    parties: mappers.party.mapParties(parties),
    addresses: mappers.address.mapAddresses(addresses)
  };
};

const importLicence = async (licenceNumber, context) => {
  const licenceData = await connectors.getLicenceData(licenceNumber);

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

  const finalLicence = mappers.licence.omitNaldData(licence);
  console.log(JSON.stringify(finalLicence, null, 2));

  return finalLicence;
};

exports.getContext = getContext;
exports.importLicence = importLicence;

// const run = async () => {
//   try {
//     const context = await getContext();
//     await importLicence('', context);
//   } catch (err) {
//     console.error(err);
//   }
// };

// run();
