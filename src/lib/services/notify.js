'use strict'

const notifyConnector = require('../connectors/water/notify')
const config = require('../../../config')

/**
 * Gets the notify template ID to use by inspecting the application config
 * @param  {Object} scheduledNotification - row from scheduled_notification table
 * @return {String}                       - Notify template ID
 */
const getNotifyTemplate = messageRef => config.notify.templates[`${messageRef}`]
/**
 * Sends an email via Water Service to Notify API
 * @param  {Object}  client                - Notify client
 * @param  {Object} messageRef - messageRef stored in config
 * @return {Promise}           - resolves when message sent
 */
const sendEmail = async (recipient, messageRef, personalisation) => {
  const templateId = getNotifyTemplate(messageRef)
  return notifyConnector.postSendNotify('email', { templateId, recipient, personalisation })
}

module.exports = {
  sendEmail
}
