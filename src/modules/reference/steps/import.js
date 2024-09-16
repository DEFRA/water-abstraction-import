'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const ConditionTypeQueries = require('../lib/condition-type-queries.js')
const FinancialAgreementTypeQueries = require('../lib/financial-agreement-type-queries.js')
const PurposeQueries = require('../lib/purpose-queries.js')

async function go () {
  try {
    global.GlobalNotifier.omg('reference.import started')

    const startTime = currentTimeInNanoseconds()

    await db.query(ConditionTypeQueries.purposeConditionTypes)

    await db.query(FinancialAgreementTypeQueries.financialAgreementTypes)

    await db.query(PurposeQueries.primaryPurposes)
    await db.query(PurposeQueries.secondaryPurposes)
    await db.query(PurposeQueries.purposes)
    await db.query(PurposeQueries.validPurposeCombinations)

    calculateAndLogTimeTaken(startTime, 'reference.import complete')
  } catch (error) {
    global.GlobalNotifier.omfg('reference.import errored', error)
    throw error
  }
}

module.exports = {
  go
}
