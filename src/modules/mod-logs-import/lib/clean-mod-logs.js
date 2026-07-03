'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _deletedModLogs()
  await _deletedLicences()
  await _deletedLicenceVersions()
  await _deletedChargeVersions()
  await _deletedReturnVersions()
}

async function _deletedChargeVersions () {
  return db.query(`DELETE FROM water.mod_logs ml
WHERE
  ml.charge_version_external_id IS NOT NULL
  AND NOT EXISTS (
    SELECT
      1
    FROM
      water.charge_versions cv
    WHERE
      cv.charge_version_id = ml.charge_version_id
  );
  `)
}

async function _deletedLicences () {
  return db.query(`DELETE FROM water.mod_logs ml
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      water.licences l
    WHERE
      l.licence_id = ml.licence_id
  );
  `)
}

async function _deletedLicenceVersions () {
  return db.query(`DELETE FROM water.mod_logs ml
WHERE
  ml.licence_version_external_id IS NOT NULL
  AND NOT EXISTS (
    SELECT
      1
    FROM
      water.licence_versions lv
    WHERE
      lv.licence_version_id = ml.licence_version_id
  );
  `)
}

async function _deletedModLogs () {
  return db.query(`WITH nald_mod_logs AS (
  SELECT
    (concat_ws(':', nml."FGAC_REGION_CODE", nml."ID")) AS external_id
  FROM
    "import"."NALD_MOD_LOGS" nml
)
DELETE FROM water.mod_logs ml
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      nald_mod_logs nml
    WHERE
      nml.external_id = ml.external_id
  );
  `)
}

async function _deletedReturnVersions () {
  return db.query(`DELETE FROM water.mod_logs ml
WHERE
  ml.return_version_external_id IS NOT NULL
  AND NOT EXISTS (
    SELECT
      1
    FROM
      water.return_versions rv
    WHERE
      rv.return_version_id = ml.return_version_id
  );
  `)
}

module.exports = {
  go
}
