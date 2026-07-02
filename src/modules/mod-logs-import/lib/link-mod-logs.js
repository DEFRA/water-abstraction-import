'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _linkLicencesToModLogs()
  await _linkChargeVersionsToModLogs()
  await _linkLicenceVersionsToModLogs()
  await _linkReturnVersionsToModLogs()
}

async function _linkLicencesToModLogs () {
  // This will link any newly imported mod log records to their licences based on licence ref (WRLS licence records
  // don't have an external_id like the other tables)
  await db.query(`
    UPDATE water.mod_logs ml
    SET licence_id = l.licence_id
    FROM water.licences l
    WHERE l.licence_ref = ml.licence_ref
    AND ml.licence_id IS NULL;
  `)
}

async function _linkChargeVersionsToModLogs () {
  // This will link any newly imported mod log records to their charge versions based on the external ID against each
  // one
  await db.query(`
    UPDATE water.mod_logs ml
    SET charge_version_id = cv.charge_version_id
    FROM water.charge_versions cv
    WHERE cv.external_id = ml.charge_version_external_id
    AND ml.charge_version_id IS NULL;
  `)
}

async function _linkLicenceVersionsToModLogs () {
  // This will link any newly imported mod log records to their licence versions based on the external ID against each
  // one
  await db.query(`
    UPDATE water.mod_logs ml
    SET licence_version_id = lv.licence_version_id
    FROM water.licence_versions lv
    WHERE lv.external_id = ml.licence_version_external_id
    AND ml.licence_version_id IS NULL;
  `)
}

async function _linkReturnVersionsToModLogs () {
  // This will link any newly imported mod log records to their return versions based on the external ID against each
  // one
  await db.query(`
    UPDATE water.mod_logs ml
    SET return_version_id = rv.return_version_id
    FROM water.return_versions rv
    WHERE rv.external_id = ml.return_version_external_id
    AND ml.return_version_id IS NULL;
  `)
}

module.exports = {
  go
}
