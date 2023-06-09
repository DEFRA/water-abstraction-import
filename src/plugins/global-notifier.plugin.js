'use strict'

/**
 * Plugin to add a globally available notifier for logging and sending exceptions to Errbit
 * @module GlobalNotifierPlugin
 */

const GlobalNotifierLib = require('../lib/notifiers/global-notifier.lib.js')

const GlobalNotifierPlugin = {
  name: 'global-notifier',
  register: (server, _options) => {
    global.GlobalNotifier = new GlobalNotifierLib(server.logger, server.app.airbrake)
  }
}

module.exports = GlobalNotifierPlugin
