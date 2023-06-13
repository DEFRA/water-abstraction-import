'use strict'

const queries = require('./queries')
const { pool } = require('../../../lib/connectors/db')

const createRow = (tableName, query) => ({
  tableName,
  query
})

const importQueries = [
  createRow('remove_constraints', queries.removeConstraints),
  createRow('billing_batches', queries.importNaldBillRuns),
  createRow('billing_invoices', queries.importNaldBillHeaders),
  createRow('billing_invoice_licences', queries.importInvoiceLicences),
  createRow('billing_transactions', queries.importTransactions),
  createRow('billing_resetSecondPartChargeFlag', queries.resetIsSecondPartChargeFlag),
  createRow('billing_setSecondPartChargeFlag', queries.setIsSecondPartChargeFlag),
  createRow('billing_volumes', queries.importBillingVolumes),
  createRow('billing_batch_charge_version_years', queries.importBillingBatchChargeVersionYears),
  createRow('add_constraints', queries.addConstraints)
]

/**
 * Run SQL queries to import bill runs to the water
 * billing tables.
 * It is envisaged this will only be run once in production
 *
 * @return {Promise}
 */
const importBillRuns = async () => {
  try {
    global.GlobalNotifier.omg('import.bill-runs: started')

    for (const { query } of importQueries) {
      await pool.query(query)
    }

    global.GlobalNotifier.omg('import.bill-runs: finished')
  } catch (error) {
    global.GlobalNotifier.omfg('import.bill-runs: errored', error)
    throw error
  }
}

module.exports = {
  importBillRuns
}
