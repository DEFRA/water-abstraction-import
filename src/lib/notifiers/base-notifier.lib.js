'use strict'

/**
 * Base class for notification managers
 * @module BaseNotifierLib
 */

const { Notifier } = require('@airbrake/node')
const Pino = require('pino')

const { airbrake: AirbrakeConfig } = require('../../../config.js')

/**
 * Based class for combined logging and Airbrake (Errbit) notification managers
 *
 * This is used to make both logging via {@link https://github.com/pinojs/pino|pino} and sending notifications to
 * Errbit via {@link https://github.com/airbrake/airbrake-js|airbrake-js} available in the service.
 *
 * Most functionality is maintained in this `BaseNotifierLib` with the expectation that classes will extend it for their
 * particular scenario, for example, the `RequestNotifierLib` adds the request ID to the log data and Airbrake session.
 *
 * > ***So, `omg()` and `omfg()`. What's that all about!?***
 * >
 * > This is a very 'serious' project dealing with very dry finance and regulation rules. We love what we do but having
 * > the opportunity to use `omg('The bill run looks fantastic!')` in our work day can only help us smile more!
 *
 * @param {Object} [logger] An instance of {@link https://github.com/pinojs/pino|pino}. If 'null' the class will
 * create a new instance instead.
 * @param {Object} [notifier] An instance of {@link https://github.com/airbrake/airbrake-js|airbrake-js} `Notifier`
 * which our 'AirbrakePlugin` adds to Hapi. If 'null' the class will create a new instance instead.
 */
class BaseNotifierLib {
  constructor (logger = null, notifier = null) {
    this._logger = this._setLogger(logger)
    this._notifier = this._setNotifier(notifier)
  }

  /**
   * Use to add a message to the log
   *
   * The message will be added as an `INFO` level log message.
   *
   * @param {string} message - Message to add to the log (INFO)
   * @param {object} [data={}] - An object containing any values to be logged, for example, a bill run ID to be included
   * with the log message. Defaults to an empty object
   */
  omg (message, data = {}) {
    this._logger.info(this._formatLogPacket(data), message)
  }

  /**
   * Use to add an 'error' message to the log and send a notification to Errbit
   *
   * Intended to be used when we want to record an error both in the logs and in Errbit. You don't have to provide
   * an error (you may just want to log an event in Errbit). But to help with grouping in Errbit and to keep things
   * consistent it will generate a new Error using the provided message.
   *
   * ## Notifications to Errbit
   *
   * Other than making errors more visible and accessible, the main benefit of Errbit is its ability to group instances
   * of the same error. But it can only do this if the 'error signature' is consistent. It is important that what we
   * send has a consistent 'message'. We can send whatever we like in the data as this is not used to generate the
   * signature.
   *
   * So, you should avoid
   *
   * ```
   * notifier.omfg(`Bill run id ${billRun.id} failed to generate.`)
   * ```
   *
   * Instead use
   *
   * ```
   * notifier.omfg('Bill run failed to generate.', { id: billRun.id })
   * ```
   *
   * @param {string} message - Message to add to the log (ERROR)
   * @param {object} [data={}] - An object containing any values to be logged and sent in the notification to Errbit,
   * for example, a bill run ID. Defaults to an empty object
   * @param {Error} [error=null] - An instance of the error to be logged and sent to Errbit. If no error is provided one
   * will be created using `message` as the error message
   */
  omfg (message, data = {}, error = null) {
    // This deals with anyone calling omfg() with `omfg('It broke', null, error)` which would cause things to break
    if (!data) {
      data = {}
    }

    // To keep logging consistent and to help grouping in Errbit we always work with an error. If one is not provided
    // (which is fine!) we create one using the message as the error message
    if (!(error instanceof Error)) {
      error = new Error(message)
    }

    this._logger.error(this._formatLogPacket(data, error), message)

    this._notifier
      .notify(this._formatNotifyPacket(data, error, message))
      // This section is a 'just in case' anything goes wrong when trying to send the notification to Errbit. It will
      // either fail (cannot connect) or blow up entirely. If it does we log the error directly (no calls to the
      // formatter)
      .then((notice) => {
        if (!notice.id) {
          this._logger.error(notice.error, `${this.constructor.name} - Airbrake failed`)
        }
      })
      .catch((err) => {
        this._logger.error(err, `${this.constructor.name} - Airbrake errored`)
      })
  }

  /**
   * Flush any outstanding Airbrake notifications
   *
   * It's not immediately obvious but Airbrake notifications are actually queued and sent in the background. This is
   * fine when the API is running. We expect it to always be running so there is plenty of time for the notifications
   * to be sent.
   *
   * In the case of tasks though, they are one time calls that expect to process.exit as soon as the work is done. Our
   * testing highlighted that should an error occur and we don't `flush()` Airbrake's queue, we never see them in
   * Errbit. So, we expose Airbrake's `flush()` using this method which notifiers that extend the base can make use of.
   */
  async flush () {
    await this._notifier.flush()
  }

  /**
   * Used to format the 'mergingObject' passed to pino to be included in the log
   *
   * This is a default implementation which can be overridden by notifiers which need to inject additional information.
   *
   * If no error is specified then it simply returns a copy of the data object passed in. If one is specified we add
   * the error to copied data object as `err:`. This mimics what pino does if an error is provided as the
   * `mergingObject` param to any log method. It wraps it in an object containing a property `err:`. They reason it
   * provides a "unified error handling flow."
   *
   * By doing it this way we can _still_ pass a `data` arg to `omfg()` and include those values in our log entry along
   * with the error.
   *
   * @private
   */
  _formatLogPacket (data, error) {
    const packet = {
      ...data
    }

    if (error instanceof Error) {
      packet.err = error
    }

    return packet
  }

  /**
   * Used to format the 'packet' of information sent to Errbit
   *
   * This is a default implementation which can be overridden by notifiers which need to inject additional values.
   *
   * Errbit works best by recording and grouping error signatures. It also ensures that any custom errors will be
   * handled by Errbit correctly. Passing the error in the `session:` property can cause Errbit to fail when rendering
   * errors notified in that way. This is why we must set the `error:` property.
   *
   * But this means Airbrake's `message:` property becomes ignored. Errbit will set the issue title using the error's
   * `message` instead. In order to see our message when a 'proper' error is passed in we include our `message` as a
   * property of `session:`.
   *
   * @private
   */
  _formatNotifyPacket (data, error, message) {
    return {
      error,
      session: {
        ...data,
        message
      }
    }
  }

  /**
   * Return the 'logger' instance
   *
   * Returns an instance of {@link https://github.com/pinojs/pino|Pino} the logger our dependency Hapi-pino brings in.
   * We can then call `info()` and `error()` on it in order to create our log entries.
   *
   * @param {object} [logger] - An instance of {@link https://github.com/pinojs/pino|pino}. If 'null' the method will
   * create a new instance.
   *
   * @private
   */
  _setLogger (logger) {
    if (logger) {
      return logger
    }

    return Pino()
  }

  /**
   * Returns the 'notifier' instance
   *
   * Returns an instance of {@link https://github.com/airbrake/airbrake-js|airbrake-js} `Notifier` which when called
   * with `notify()` will record errors in our Errbit instance.
   *
   * @param {object} [notifier] - An instance of the {@link https://github.com/airbrake/airbrake-js|airbrake-js}
   * `Notifier`. If 'null' the class will create a new instance instead.
   *
   * @private
   */
  _setNotifier (notifier) {
    if (notifier) {
      return notifier
    }

    return new Notifier({
      host: AirbrakeConfig.host,
      projectId: AirbrakeConfig.projectId,
      projectKey: AirbrakeConfig.projectKey,
      environment: AirbrakeConfig.environment,
      performanceStats: false
    })
  }
}

module.exports = BaseNotifierLib
