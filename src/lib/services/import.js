
'use strict';

const importConnector = require('../connectors/import');

const getLicenceNumbers = async () => {
  const licenceNumbers = await importConnector.getLicenceNumbers();
  return licenceNumbers.map(licenceNumber => licenceNumber.LIC_NO);
};

exports.getLicenceNumbers = getLicenceNumbers;
