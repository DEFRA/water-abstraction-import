'use strict'

const { pool } = require('../../../lib/connectors/db')
const queries = require('./queries/documents')

/**
 * Mark any documents in crm_v2.documents as deleted if the licence
 * numbers no longer exist in import.NALD_ABS_LICENCES
 */
const deleteRemovedDocuments = () => pool.query(queries.deleteCrmV2Documents)

module.exports = {
  deleteRemovedDocuments
}
