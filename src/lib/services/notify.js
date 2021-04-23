'use strict';

const notifyConnector = require('../connectors/water/notify');

const sendNotifyMessage = async (messageRef, data) => {
  return notifyConnector.postSendMessage(messageRef, data);
};

exports.sendNotifyMessage = sendNotifyMessage;
