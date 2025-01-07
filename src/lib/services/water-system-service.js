'use strict'

const { serviceRequest } = require('@envage/water-abstraction-helpers')

const config = require('../../../config')

const postLicencesEndDatesCheck = async () => {
  const url = new URL(`${config.services.system}/licences/end-dates/check`)

  return serviceRequest.post(url.href)
}

const postLicencesEndDatesProcess = async () => {
  const url = new URL(`${config.services.system}/licences/end-dates/process`)

  return serviceRequest.post(url.href)
}

module.exports = {
  postLicencesEndDatesCheck,
  postLicencesEndDatesProcess
}
