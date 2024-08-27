'use strict'

const { serviceRequest } = require('@envage/water-abstraction-helpers')

const config = require('../../../config')

const postImportLicence = async (data) => {
  const url = new URL(`${config.services.system}/import/licence/legacy`)

  return serviceRequest.post(url.href, {
    body: data,
    resolveWithFullResponse: true
  })
}

module.exports = {
  postImportLicence
}
