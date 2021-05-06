'use strict';

const notifyConnector = require('../connectors/notify');
const { get } = require('lodash');
var jwt = require('jsonwebtoken');
const config = require('../../../config');
const gotWithProxy = require('./got-with-proxy');

const generateNotifyBearerToken = () => {
  const { key } = config.notify;

  const apiSecret = key.match(/(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}:/)[0];
  const iss = key.match(/(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}[-]/)[0].slice(0, -1);

  return jwt.sign({
    iss,
    iat: Math.floor(Date.now() / 1000)
  }, apiSecret);
};

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
  try {
    gotWithProxy.post('https://api.notifications.service.gov.uk/', {
      json: {
        email_address: process.env.WATER_SERVICE_MAILBOX,
        template_id: getNotifyTemplate(messageRef),
        personalisation
      },
      headers: {
        Authorization: `Bearer ${generateNotifyBearerToken()}`
      }
    });
  } catch (e) {
    throw new Error('An error occured when attempting to send an email via Notify', e);
  }

  /* const client = notifyConnector.getClient('email');
  const templateId = getNotifyTemplate(messageRef);
  return client.sendEmail(templateId, recipient, { personalisation });

   */
};

exports.sendEmail = sendEmail;
