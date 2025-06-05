'use strict'

const Joi = require('@hapi/joi')
const controller = require('./controller')

const getLinesForVersion = {
  method: 'GET',
  handler: controller.getLinesForVersion,
  options: {
    description: 'Gets the lines for the specified version id',
    validate: {
      params: {
        versionID: Joi.string().uuid().required()
      }
    }
  },
  path: '/etl/versions/{versionID}/lines'
}

module.exports = [
  getLinesForVersion
]
