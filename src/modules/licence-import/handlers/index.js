module.exports = {
  deleteDocuments: require('./delete-documents'),
  onCompleteDeleteDocuments: require('./on-complete-delete-documents'),

  importCompany: require('./import-company'),
  onCompleteImportCompany: require('./on-complete-import-company'),

  importCompanies: require('./import-companies'),
  onCompleteImportCompanies: require('./on-complete-import-companies'),

  importLicences: require('./import-licences'),
  onCompleteImportLicences: require('./on-complete-import-licences'),

  importLicence: require('./import-licence'),

  importPurposeConditionTypes: require('./import-purpose-condition-types'),
  onCompleteImportPurposeConditionTypes: require('./on-complete-import-purpose-condition-types')
}
