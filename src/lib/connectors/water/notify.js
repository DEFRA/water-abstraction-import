'use strict';

const { serviceRequest } = require('@envage/water-abstraction-helpers');
const urlJoin = require('url-join');

const config = require('../../../../config');

const getUrl = key => urlJoin(config.services.water, 'notify', key);

const postSendNotify = (key, data) => {
  const url = getUrl(key);
  return serviceRequest.post(url, {
    body: data
  });
};

exports.postSendNotify = postSendNotify;
