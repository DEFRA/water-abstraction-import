'use strict'

/**
 * @module GlobalNotifierLib
 */

const BaseNotifierLib = require('./base-notifier.lib.js')

/**
 * A combined logging and Airbrake (Errbit) notification manager for actions that take place outside of a
 * {@link https://hapi.dev/api/?v=20.1.2#request|Hapi request}
 *
 * Created for use with the `app/plugins/global-notifier.plugin.js`.
 */
class GlobalNotifierLib extends BaseNotifierLib {
  constructor (logger, notifier) {
    // This is here more to make it clear that we expect these args to be provided. BaseNotifierLib has the built-in
    // ability to instantiate them if not provided. But for our use case in global-notifier.plugin.js we want to ensure
    // we are using the existing instances.
    if (!logger || !notifier) {
      throw new Error('new instance of GlobalNotifierLib is missing a required argument')
    }

    super(logger, notifier)
  }
}

module.exports = GlobalNotifierLib
