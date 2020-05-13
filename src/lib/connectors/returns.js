'use strict';

const { APIClient } = require('@envage/hapi-pg-rest-api');
const { serviceRequest } = require('@envage/water-abstraction-helpers');
const config = require('../../../config');

const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false
});

const versions = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/versions`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
});

const lines = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/lines`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
});

const returns = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/returns`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
});

/**
 * Makes a POST request to the returns service that causes any
 * returns not in the list of validReturnIds for the given
 * licence number to be marked as void.
 *
 * @param {String} licenceNumber The licence number
 * @param {Array} validReturnIds An array of return ids that are valid and
 * therefore will not be made void
 */
const voidReturns = (licenceNumber, validReturnIds = []) => {
  if (!validReturnIds.length) {
    return Promise.resolve();
  }

  const url = `${config.services.returns}/void-returns`;
  const body = {
    regime: 'water',
    licenceType: 'abstraction',
    licenceNumber,
    validReturnIds
  };

  return serviceRequest.patch(url, { body });
};

exports.versions = versions;
exports.lines = lines;
exports.returns = returns;
exports.voidReturns = voidReturns;
