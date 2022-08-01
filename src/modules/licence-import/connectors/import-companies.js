const queries = require('./queries/import-companies')
const { pool } = require('../../../lib/connectors/db')

/**
 * Clear the water_import.import_companies table ready for a new import
 * @return {Promise}
 */
const clear = () =>
  pool.query(queries.clear)

/**
 * Initialise the water_import.import_companies table by copying a list
 * of all NALD parties to the local table
 * @return {Promise}
 */
const initialise = async () => {
  const { rows } = await pool.query(queries.initialise)
  return rows
}

/**
 * Sets the specified party as imported in the water_import.import_companies table
 * @param {Number} regionCode
 * @param {Number} partyId
 * @return {Promise}
 */
const setImportedStatus = (regionCode, partyId) =>
  pool.query(queries.setImportedStatus, [regionCode, partyId])

/**
 * Gets the number of parties which still need importing as companies
 * @return {Promise<Number>}
 */
const getPendingCount = async () => {
  const { rows: [{ count }] } = await pool.query(queries.getPendingCount)
  return parseInt(count)
}

module.exports = {
  clear,
  initialise,
  setImportedStatus,
  getPendingCount
}
