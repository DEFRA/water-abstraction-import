'use strict'

const db = require('../connectors/db.js')

const FetchCams = require('./fetch-cams.js')
const FetchCurrentVersion = require('./fetch-current-version.js')
const FetchPurposes = require('./fetch-purposes.js')
const FetchRoles = require('./fetch-roles.js')
const FetchVersions = require('./fetch-versions.js')

/**
 * Generates the JSON persisted to the `permit.licence` table's `licence_data_value` field.
 *
 * This is essentially a 'dump' of everything related to the licence in NALD. What we realised when hacking together a
 * more performant import process, was that if we passed this object to the other processes, we could remove the need for them
 * to also make calls to the DB. They could extract the data they need from this object.
 *
 * Hence us moving the functionality to generate the JSON object into `lib/` and out of `modules/`.
 *
 * @param {object|string} licence - Either an object representing the NALD licence, or a licence reference
 *
 * @returns {object} An object containing everything related to the NALD licence that will be persisted as the
 * `licence_data_value`.
 */
async function go (licence) {
  licence = await _licence(licence)

  const licencePurposes = await FetchPurposes.go(licence)
  const licenceVersions = await FetchVersions.go(licence)
  const licenceCams = await FetchCams.go(licence)
  const licenceRoles = await FetchRoles.go(licence)

  const currentLicenceVersion = await FetchCurrentVersion.go(licence, licenceVersions, licencePurposes)

  const transformedLicence = { ...licence }

  transformedLicence.vmlVersion = 2
  transformedLicence.data = {}
  transformedLicence.data.versions = licenceVersions
  transformedLicence.data.current_version = currentLicenceVersion
  transformedLicence.data.cams = licenceCams
  transformedLicence.data.roles = licenceRoles
  transformedLicence.data.purposes = licencePurposes

  return transformedLicence
}

/**
 * When called from the import-job, `LicenceDataImportJob` passes in an object, the result of calling `SELECT * FROM
 * "import"."NALD_ABS_LICENCES"`.
 *
 * When called from a POST request (for testing/debugging), licence will be a reference, so we need to first fetch
 * the matching NALD licence record.
 *
 * @private
 */
async function _licence (licence) {
  if (typeof licence !== 'string') {
    return licence
  }

  const results = await db.query('SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;', [licence])

  return results[0]
}

module.exports = {
  go
}
