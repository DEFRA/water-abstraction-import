'use strict';

const notifyConnector = require('../connectors/notify');
const { get } = require('lodash');
const config = require('../../../config');

/**
 * Gets the notify template ID to use by inspecting the application config
 * @param  {Object} scheduledNotification - row from scheduled_notification table
 * @return {String}                       - Notify template ID
 */
const getNotifyTemplate = messageRef => get(config, `notify.templates.${messageRef}`);

/**
 * Sends an email via Notify API
 * @param  {Object}  client                - Notify client
 * @param  {Object} scheduledNotification - row from scheduled_notification table
 * @return {Promise}                        resolves when message sent
 */
const sendEmail = async (recipient, messageRef, personalisation) => {
  const client = notifyConnector.getClient('email');
  const templateId = getNotifyTemplate(messageRef);
  return client.sendEmail(templateId, recipient, { personalisation });
};

exports.sendEmail = sendEmail;
