'use strict';

const { serviceRequest } = require('@envage/water-abstraction-helpers');
const urlJoin = require('url-join');

const config = require('../../../../config');

const getUrl = messageRef => {
  return urlJoin(config.services.water, 'notify', messageRef);
};

const postSendMessage = (messageRef, data) => {
  const url = getUrl(messageRef);
  return serviceRequest.post(url, {
    body: data
  });
};

exports.postSendMessage = postSendMessage;
