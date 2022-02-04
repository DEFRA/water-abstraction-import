'use strict';

const Joi = require('@hapi/joi');
const controller = require('./controller');
const config = require('../../../config');

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

const reimportReturns = {
  method: 'POST',
  handler: controller.postReimportReturns,
  options: {
    description: 'Re-imports returns data for a given licence - to be used in non-production environments only.',
    validate: {
      payload: {
        licenceRef: Joi.string().required()
      }
    }
  },
  path: '/etl/returns/re-import'
};

const routes = [
  getVersions,
  getLinesForVersion,
  getReturns
];

if (config.isAcceptanceTestTarget) {
  routes.push(reimportReturns);
}

module.exports = routes;
