'use strict'

const db = require('../../../lib/connectors/db.js')
const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../../lib/general.js')
const Queries = require('../lib/queries.js')

async function go () {
  try {
    global.GlobalNotifier.omg('bill-runs.import started')

    const startTime = currentTimeInNanoseconds()

    await db.query(Queries.removeConstraints)
    await db.query(Queries.importNaldBillRuns)
    await db.query(Queries.importNaldBillHeaders)
    await db.query(Queries.importInvoiceLicences)
    await db.query(Queries.importTransactions)
    await db.query(Queries.resetIsSecondPartChargeFlag)
    await db.query(Queries.setIsSecondPartChargeFlag)
    await db.query(Queries.importBillingVolumes)
    await db.query(Queries.importBillingBatchChargeVersionYears)
    await db.query(Queries.addConstraints)

    calculateAndLogTimeTaken(startTime, 'bill-runs.import complete')
  } catch (error) {
    global.GlobalNotifier.omfg('bill-runs.import errored', error)
    throw error
  }
}

module.exports = {
  go
}
