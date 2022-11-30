'use strict'

const mapLicenceToDocument = licence => {
  const { startDate, endDate, externalId } = licence
  return {
    documentRef: licence.licenceNumber,
    startDate,
    endDate,
    externalId,
    roles: [],
    _nald: licence._nald
  }
}

module.exports = {
  mapLicenceToDocument
}
