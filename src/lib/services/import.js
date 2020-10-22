
'use strict';

const importConnector = require('../connectors/import');

const getLicenceNumbers = async () => {
  const licenceNumbers = await importConnector.getLicenceNumbers();
  return licenceNumbers.map(licenceNumber => licenceNumber.LIC_NO);
};

const deleteRemovedDocuments = async () => {
  return importConnector.deleteRemovedDocuments();
};

exports.deleteRemovedDocuments = deleteRemovedDocuments;
exports.getLicenceNumbers = getLicenceNumbers;
