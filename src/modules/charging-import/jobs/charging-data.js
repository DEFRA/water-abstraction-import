'use strict'

/**
 * @note: this needs to remain and should not be deleted
 */

const job = require('../lib/job')
const queryLoader = require('../lib/query-loader')
const purposesQueries = require('../lib/queries/purposes')
const financialAgreementTypeQueries = require('../lib/queries/financial-agreement-types')

const jobName = 'import.charging-data'

const createMessage = () => job.createMessage(jobName)

const handler = async () => {
  try {
    global.GlobalNotifier.omg('import.charging-data: started')

    await queryLoader.loadQueries([
      financialAgreementTypeQueries.importFinancialAgreementTypes,
      purposesQueries.importPrimaryPurposes,
      purposesQueries.importSecondaryPurposes,
      purposesQueries.importUses,
      purposesQueries.importValidPurposeCombinations
    ])

    global.GlobalNotifier.omg('import.charging-data: finished')
  } catch (error) {
    global.GlobalNotifier.omfg('import.charging-data: errored', error)
    throw error
  }
}

module.exports = {
  jobName,
  createMessage,
  handler
}
