const mappers = require('./mappers');

const mapContactData = data => ({
  parties: mappers.party.mapParties(data.parties),
  addresses: mappers.address.mapAddresses(data.addresses)
});

/**
 * Gets the CRM v2 licence model from data in the import database
 * @param {String} licenceNumber - The licence to load
 * @return {Promise<Object>} - the CRM v2 licence model
 */
const transformLicence = licenceData => {
  // Get licence
  const licence = mappers.licence.mapLicence(licenceData.licence);

  // Get documents
  licence.documents = mappers.document.mapDocuments(licenceData.versions, licence);

  // Get party/address data
  const context = mapContactData(licenceData);

  // Get licence holder/billing document roles
  licence.documents.forEach(doc => {
    const roles = [
      ...mappers.role.mapLicenceHolderRoles(doc, context),
      ...mappers.role.mapBillingRoles(doc, licenceData.chargeVersions, context)
    ];
    doc.roles.push(...roles);
  });

  // Agreements - section 127/130
  licence.agreements = mappers.agreement.mapAgreements(licenceData.tptAgreements, licenceData.section130Agreements);

  const finalLicence = mappers.licence.omitNaldData(licence);

  return finalLicence;
};

exports.transformLicence = transformLicence;
