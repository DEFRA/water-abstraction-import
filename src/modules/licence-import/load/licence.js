const connectors = require('./connectors');

const loadDocumentRoles = async document => {
  const tasks = document.roles.map(role =>
    connectors.createDocumentRole(document, role)
  );
  return Promise.all(tasks);
};

const loadDocument = async document => {
  await connectors.createDocument(document);
  return loadDocumentRoles(document);
};

const loadAgreements = licence => {
  const tasks = licence.agreements.map(agreement =>
    connectors.createAgreement(licence, agreement)
  );
  return Promise.all(tasks);
};

const loadVersionPurposes = (licenceVersionId, version) => {
  return Promise.all(version.purposes.map(purpose => {
    return connectors.createLicenceVersionPurpose(purpose, licenceVersionId);
  }));
};

const loadVersions = (licenceData, licenceId) => {
  return Promise.all(licenceData.versions.map(async version => {
    const versionResult = await connectors.createLicenceVersion(version, licenceId);
    return loadVersionPurposes(versionResult.licence_version_id, version);
  }));
};

const loadLicence = async licence => {
  const licencePriorToImport = await connectors.getLicenceByRef(licence.licenceNumber);

  const tasks = [
    connectors.createLicence(licence),
    licence.documents.map(loadDocument),
    loadAgreements(licence)
  ];

  /*
    *  If the expired_date, lapsed_date or revoked_date are changed,
    *  flag the licence for supplementary billing
    */
  if (licencePriorToImport && ((licencePriorToImport.expired_date !== licence.expiredDate) ||
      (licencePriorToImport.lapsed_date !== licence.lapsedDate) ||
      (licencePriorToImport.revoked_date !== licence.revokedDate)
  )) {
    tasks.push(connectors.flagLicenceForSupplementaryBilling(licencePriorToImport.licence_id));
  }

  const [savedLicence] = await Promise.all(tasks);

  return loadVersions(licence, savedLicence.licence_id);
};

exports.loadLicence = loadLicence;
