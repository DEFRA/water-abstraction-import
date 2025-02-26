'use strict'

const FetchCams = require('./fetch-cams.js')
const FetchCurrentVersion = require('./fetch-current-version.js')
const FetchPurposes = require('./fetch-purposes.js')
const FetchRoles = require('./fetch-roles.js')
const FetchVersions = require('./fetch-versions.js')

async function go (licence) {
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

module.exports = {
  go
}
