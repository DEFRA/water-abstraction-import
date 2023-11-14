'use strict'

/**
 * Plugin to log errors using Airbrake API
 * @module AirbrakePlugin
 */

/**
 * We use Airbrake to capture errors thrown within the service and send them to an instance of Errbit we maintain in
 * Defra.
 *
 * {@link https://hapi.dev/api/?v=20.0.0#-request-event}
 *
 * Airbrake doesn't provide a specific Hapi plugin. We've avoided others as they are very out of date. So instead we
 * roll our own plugin using the following as references.
 *
 * {@link https://github.com/DEFRA/node-hapi-airbrake/blob/master/lib/index.js}
 * {@link https://github.com/DEFRA/charging-module-api/blob/master/app/plugins/airbrake.js}
 */

const { Notifier } = require('@airbrake/node')
const Request = require('request')

const { airbrake: AirbrakeConfig } = require('../../config.js')
const { proxy } = require('../../config.js')

const AirbrakePlugin = {
  name: 'airbrake',
  register: (server, _options) => {
    // We add an instance of the Airbrake Notifier so we can send notifications via Airbrake to Errbit manually if
    // needed. It's main use is when passed in as a param to RequestNotifierLib in the RequestNotifierPlugin
    server.app.airbrake = new Notifier(_notifierArgs())

    // When Hapi emits a request event with an error we capture the details and use Airbrake to send a request to our
    // Errbit instance
    server.events.on({ name: 'request', channels: 'error' }, (request, event, _tags) => {
      server.app.airbrake
        .notify({
          error: event.error,
          session: {
            route: request.route.path,
            method: request.method,
            url: request.url.href
          }
        })
        .then(notice => {
          if (!notice.id) {
            server.logger.error({ message: `Airbrake notification failed: ${notice.error}`, error: notice.error })
          }
        })
        .catch(error => {
          server.logger.error({ message: `Airbrake notification errored: ${error}`, error })
        })
    })
  }
}

function _notifierArgs () {
  const args = {
    host: AirbrakeConfig.host,
    projectId: AirbrakeConfig.projectId,
    projectKey: AirbrakeConfig.projectKey,
    environment: AirbrakeConfig.environment,
    errorNotifications: true,
    performanceStats: false,
    remoteConfig: false
  }

  if (proxy) {
    args.request = Request.defaults({ proxy })
  }

  return args
}

module.exports = AirbrakePlugin
