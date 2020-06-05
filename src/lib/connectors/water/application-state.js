'use strict';

const { serviceRequest } = require('@envage/water-abstraction-helpers');
const urlJoin = require('url-join');

const config = require('../../../../config');

const getUrl = key => {
  return urlJoin(config.services.water, 'application-state', key);
};

const getState = key => serviceRequest.get(getUrl(key));

const postState = (key, data) => {
  const url = getUrl(key);
  return serviceRequest.post(url, {
    body: data
  });
};

exports.getState = getState;
exports.postState = postState;
