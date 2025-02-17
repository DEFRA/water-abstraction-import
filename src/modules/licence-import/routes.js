'use strict'

const Joi = require('@hapi/joi')

const controller = require('./controller')

module.exports = [
  {
    method: 'post',
    handler: controller.postImportLicence,
    path: '/import/licence',
    options: {
      validate: {
        query: Joi.object({
          licenceNumber: Joi.string().required()
        })
      }
    }
  },
  {
    method: 'post',
    handler: controller.postImportCompany,
    path: '/import/company',
    options: {
      validate: {
        query: Joi.object({
          regionCode: Joi.number().integer().min(1).max(8),
          partyId: Joi.number().integer().min(0)
        })
      }
    }
  }
]
