'use strict'

/**
 * @note: this needs to remain and should not be deleted
 */

const job = require('../lib/job')
const queryLoader = require('../lib/query-loader')
const purposesQueries = require('../lib/queries/purposes')
const returnVersionQueries = require('../lib/queries/return-versions')
const financialAgreementTypeQueries = require('../lib/queries/financial-agreement-types')

const jobName = 'import.charging-data'

const createMessage = () => job.createMessage(jobName)

const handler = () => queryLoader.loadQueries('Import charging data', [
  financialAgreementTypeQueries.importFinancialAgreementTypes,
  purposesQueries.importPrimaryPurposes,
  purposesQueries.importSecondaryPurposes,
  purposesQueries.importUses,
  purposesQueries.importValidPurposeCombinations,
  returnVersionQueries.importReturnVersions,
  returnVersionQueries.importReturnRequirements,
  returnVersionQueries.importReturnRequirementPurposes
])

module.exports = {
  jobName,
  createMessage,
  handler
}
