'use strict';

const connectors = require('./connectors');
const config = require('../../../../config');
const roles = require('../transform/mappers/roles');

const isImportableRole = role => {
  if (config.import.licences.isBillingDocumentRoleImportEnabled) {
    return true;
  }

  // Where the import of billing document roles is disabled via the
  // config flag, we will import any role where it does not have
  // a "billing" role
  return role.role !== roles.ROLE_BILLING;
};

const loadDocumentRoles = async document => {
  const tasks = document.roles
    .filter(isImportableRole)
    .map(role =>
      connectors.createDocumentRole(document, role)
    );
  return Promise.all(tasks);
};

const loadDocument = async document => {
  await connectors.createDocument(document);
  return loadDocumentRoles(document);
};

const loadAgreements = async licence => {
  // Allow import of licence agreements to be disabled for charging go live
  if (!config.import.licences.isLicenceAgreementImportEnabled) {
    return Promise.resolve([]);
  }

  // Deletes any "nald" agreements not found via the current import process
  await connectors.cleanUpAgreements(licence);

  const tasks = licence.agreements.map(agreement =>
    connectors.createAgreement(licence, agreement)
  );
  return Promise.all(tasks);
};

const loadPurposeConditions = (purposeId, purpose) => {
  return Promise.all(purpose.conditions.map(async condition => {
    return connectors.createPurposeCondition(condition, purposeId);
  }));
};

const loadVersionPurposes = (licenceVersionId, version) => {
  return Promise.all(version.purposes.map(async purpose => {
    const purposeResult = await connectors.createLicenceVersionPurpose(purpose, licenceVersionId);
    return loadPurposeConditions(purposeResult.licence_version_purpose_id, purpose);
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
