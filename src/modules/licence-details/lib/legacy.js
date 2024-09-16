'use strict'

// To be able to focus on dropping pg-boss from the import and get it running again we have not had the time to
// update all legacy transformation code. We found this gnarly piece of work and decided there would be too much risk
// to attempt to re-write it in the time we have.
function isLicenceVersionReplaced (licenceVersion, licenceVersions) {
  return licenceVersions.some(comparisonLicenceVersion => {
    const isSameStartDate = comparisonLicenceVersion.EFF_ST_DATE === licenceVersion.EFF_ST_DATE
    const isFollowingVersion = _compareLicenceVersions(licenceVersion, comparisonLicenceVersion) === 1
    return isSameStartDate && isFollowingVersion
  })
}

function _compareLicenceVersions (licenceVersionA, licenceVersionB) {
  const versionA = _getVersion(licenceVersionA)
  const versionB = _getVersion(licenceVersionB)
  if (versionA.issue === versionB.issue) {
    if (versionA.increment === versionB.increment) {
      return 0
    }
    return versionA.increment > versionB.increment ? -1 : +1
  }
  return versionA.issue > versionB.issue ? -1 : +1
}

function _getVersion (licenceVersion) {
  return {
    issue: parseInt(licenceVersion.ISSUE_NO),
    increment: parseInt(licenceVersion.INCR_NO)
  }
}

module.exports = {
  isLicenceVersionReplaced
}
