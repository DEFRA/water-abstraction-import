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
        end: Joi.string().isoDate().optional(),
        pagination: Joi.object().keys({
          page: Joi.number(),
          perPage: Joi.number()
        }).optional()
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

const getReturns = {
  method: 'GET',
  handler: controller.getReturns,
  options: {
    description: 'Gets the returns which have returns.status events within a defined date range',
    validate: {
      query: {
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().optional(),
        pagination: Joi.object().keys({
          page: Joi.number(),
          perPage: Joi.number()
        }).optional()
      }
    }
  },
  path: '/etl/returns'
};

module.exports = [
  getVersions,
  getLinesForVersion,
  getReturns
];
