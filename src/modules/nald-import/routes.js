'use strict'

const Joi = require('@hapi/joi')

const controller = require('./controller')

module.exports = [
  {
    method: 'GET',
    path: '/import/1.0/nald/licence',
    handler: controller.getLicence,
    config: { description: 'Get permit repo packet by licence number' }
  },
  {
    method: 'POST',
    path: '/import/1.0/nald/licence',
    handler: controller.postImportLicence,
    options: {
      validate: {
        payload: {
          licenceNumber: Joi.string().required()
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/import/1.0/nald/licences',
    handler: controller.postImportLicences,
    config: { description: 'Trigger the NALD licences import process' }
  }
]
