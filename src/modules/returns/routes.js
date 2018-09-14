'use strict';

const Joi = require('joi');
const controller = require('./controller');

const getVersions = {
  method: 'GET',
  handler: controller.getVersions,
  options: {
    description: 'Gets the current versions with a defined date range',
    validate: {
      query: {
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().optional()
      }
    }
  },
  path: '/etl/versions'
};

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
};

module.exports = [
  getVersions,
  getLinesForVersion
];
