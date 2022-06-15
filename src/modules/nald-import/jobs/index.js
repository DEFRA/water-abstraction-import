'use strict';

const s3Download = {
  job: require('./s3-download'),
  onCompleteHandler: require('./s3-download-complete')
};

const populatePendingImport = {
  job: require('./populate-pending-import'),
  onCompleteHandler: require('./populate-pending-import-complete')
};

const deleteRemovedDocuments = {
  job: require('./delete-removed-documents'),
  onCompleteHandler: require('./delete-removed-documents-complete')
};

const importLicence = {
  job: require('./import-licence')
};

module.exports = {
  s3Download,
  populatePendingImport,
  deleteRemovedDocuments,
  importLicence
};
