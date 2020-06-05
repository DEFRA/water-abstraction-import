'use strict';

const Joi = require('@hapi/joi');

const controller = require('./controller');

module.exports = [
  {
    method: 'post',
    handler: controller.postImport,
    path: '/import/licences'
  },
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
  }
];
