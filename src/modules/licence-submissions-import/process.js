'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const OldLinesCheck = require('./lib/old-lines-check.js')
const PersistSubmissions = require('./lib/persist-submissions.js')
const ReplicateSubmissions = require('./lib/replicate-submissions.js')

async function go (licence, oldLinesExist = null, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    // Determine if the one-off pre-2013 NALD return lines data extract table exists and is populated
    oldLinesExist = await _oldLinesCheck(oldLinesExist)

    if (!oldLinesExist) {
      global.GlobalNotifier.omg('licence-submissions-import: skipped')
      messages.push('Skipped because the missing NALD return lines have not been extracted yet')

      return messages
    }

    const returnLogsMissingSubmission = await _returnLogsMissingSubmission(licence.LIC_NO)

    if (returnLogsMissingSubmission.length > 0) {
      await _import(returnLogsMissingSubmission)
    }

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-submissions-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-submissions-import: errored', { licence }, error)

    messages.push(error.message)
  }

  return messages
}

async function _import (returnLogsMissingSubmission) {
  const { lines, versions } = await ReplicateSubmissions.go(returnLogsMissingSubmission)

  await PersistSubmissions.go(lines, versions)
}

async function _returnLogsMissingSubmission (licenceRef) {
  const params = [licenceRef]
  const query = `
    SELECT
      rl.return_id,
      rl.start_date,
      rl.end_date,
      rl.return_requirement,
      rl.returns_frequency,
      CAST(rl.metadata->>'isCurrent' AS BOOLEAN) AS "current",
      CAST(rl.metadata->>'version' AS INTEGER) AS version_number,
      r.nald_region_id
    FROM "returns"."returns" rl
    INNER JOIN water.licences l
      ON l.licence_ref = rl.licence_ref
    INNER JOIN water.regions r
      ON r.region_id = l.region_id
    LEFT JOIN "returns".versions v
      ON v.return_id = rl.return_id
    WHERE
      rl.status = 'completed'
      AND v.version_id IS NULL
      AND rl.licence_ref = $1;
  `

  return db.query(query, params)
}

/**
 * Helper function that allows the process to handle being called from the licence-data-import job (where oldLinesExist
 * will be provided) or the controller for testing (where it won't be).
 */
async function _oldLinesCheck (oldLinesExist) {
  if (oldLinesExist !== null) {
    return oldLinesExist
  }

  return OldLinesCheck.go()
}

module.exports = {
  go
}
