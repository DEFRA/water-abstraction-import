'use strict'

function go (licenceVersions) {
  return licenceVersions.filter((licenceVersion) => {
    return !_replaced(licenceVersion, licenceVersions)
  })
}

function _replaced (licenceVersion, otherLicenceVersions) {
  const replaced = otherLicenceVersions.some((otherLicenceVersion) => {
    const sameStartDate = licenceVersion.EFF_ST_DATE === otherLicenceVersion.EFF_ST_DATE

    if (!sameStartDate) {
      return false
    }

    return _compareLicenceVersions(licenceVersion, otherLicenceVersion)
  })

  return replaced
}

function _compareLicenceVersions (licenceVersionA, licenceVersionB) {
  const versionA = { issueNo: parseInt(licenceVersionA.ISSUE_NO), increment: parseInt(licenceVersionA.INCR_NO) }
  const versionB = { issueNo: parseInt(licenceVersionB.ISSUE_NO), increment: parseInt(licenceVersionB.INCR_NO) }

  if (versionA.issueNo > versionB.issueNo) {
    return 1
  }

  if (versionA.issueNo < versionB.issueNo) {
    return -1
  }

  if (versionA.increment > versionB.increment) {
    return -1
  }

  if (versionA.increment < versionB.increment) {
    return 1
  }

  return 0
}

module.exports = {
  go
}
