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

/**
 * @TODO
 * - Licence agreements
 * @param {Object} licence
 */
const loadLicence = async licence => {
  const tasks = [
    licence.documents.map(loadDocument),
    loadAgreements(licence)
  ];
  return Promise.all(tasks);
};

exports.loadLicence = loadLicence;
