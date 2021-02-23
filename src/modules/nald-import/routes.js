'use strict';

const Joi = require('@hapi/joi');

const controller = require('./controller');

module.exports = [
  {
    method: 'GET',
    path: '/import/1.0/nald/licence',
    handler: controller.getLicence,
    config: { description: 'Get permit repo packet by licence number' }
  },
  {
    method: 'GET',
    path: '/import/1.0/nald/returns',
    handler: controller.getReturns,
    config: { description: 'Get a returns data packet by licence number' }
  },
  {
    method: 'GET',
    path: '/import/1.0/nald/returns/formats',
    handler: controller.getReturnsFormats,
    config: { description: 'Gets a returns formats for given licence number' }
  },
  {
    method: 'GET',
    path: '/import/1.0/nald/returns/logs',
    handler: controller.getReturnsLogs,
    config: { description: 'Gets a returns logs for given format' }
  },
  {
    method: 'GET',
    path: '/import/1.0/nald/returns/lines',
    handler: controller.getReturnsLogLines,
    config: { description: 'Gets a returns lines for a given log' }
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
  }
];
