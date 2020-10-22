'use strict';

exports.s3Download = {
  job: require('./s3-download'),
  onCompleteHandler: require('./s3-download-complete')
};

exports.populatePendingImport = {
  job: require('./populate-pending-import'),
  onCompleteHandler: require('./populate-pending-import-complete')
};

exports.deleteRemovedDocuments = {
  job: require('./delete-removed-documents'),
  onCompleteHandler: require('./delete-removed-documents-complete')
};

exports.importLicence = {
  job: require('./import-licence')
};
