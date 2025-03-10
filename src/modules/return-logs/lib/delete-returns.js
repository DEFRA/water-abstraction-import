'use strict'

/**
 * Delete existing return logs and their submission data which match those determined by the import job
 * @module
 */

const db = require('../../../lib/connectors/db.js')

/**
 * Delete existing return logs and their submission data which match those determined by the import job
 *
 * > Only used when replicate return logs is triggered manually via endpoint
 *
 * This is only expected to be used when someone chooses to reset their local returns data to match what is currently
 * held in NALD.
 *
 * It existed in the import code we inherited, but we have had no use to call it yet. Just to be sure though, we have
 * retained it and will do so until WRLS has taken control of returns from NALD and the import job no longer runs.
 *
 * @param  {object[]} rows - rows of return logs generated by the import
 */
async function go (rows) {
  for (const row of rows) {
    const { return_id: returnId } = row

    await _deleteLines(returnId)
    await _deleteVersions(returnId)
    await _deleteReturn(returnId)
  }
}

async function _deleteLines (returnId) {
  await db.query(
    'DELETE FROM "returns".lines WHERE version_id IN (SELECT version_id FROM "returns".versions WHERE return_id = $1);',
    [returnId]
  )
}

async function _deleteReturn (returnId) {
  await db.query(
    'DELETE from "returns"."returns" WHERE return_id = $1;',
    [returnId]
  )
}

async function _deleteVersions (returnId) {
  await db.query(
    'DELETE FROM "returns".versions WHERE return_id = $1;',
    [returnId]
  )
}

module.exports = {
  go
}
