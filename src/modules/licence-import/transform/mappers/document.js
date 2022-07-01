'use strict'

const { pick } = require('lodash')

const mapLicenceToDocument = licence => ({
  documentRef: licence.licenceNumber,
  ...pick(licence, ['startDate', 'endDate', 'externalId']),
  roles: [],
  _nald: licence._nald
})

module.exports = {
  mapLicenceToDocument
}
