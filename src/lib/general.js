'use strict'

const { randomUUID } = require('crypto')

/**
 * Calculates and logs the time taken in milliseconds between the provided `startTime` and the current time
 *
 * We often want to see how long a process takes and capture it in our logs. This can be especially useful when we
 * have a process that involves talking to an external one. By capturing the time it takes our process to complete
 * we can deal with any challenges about the performance of our process VS the total time taken.
 *
 * To do that you need to record the time when the process starts and the time when the process ends and then work out
 * the duration. Doing that with JavaScript time constructs though gets very messy and we want to avoid bringing in
 * 3rd party packages for just this one thing.
 *
 * Unfortunately, we cannot find the original source but a 'neat' way of doing it is to use
 * {@link https://nodejs.org/api/process.html#processhrtimebigint | process.hrtime.bigint()} which returns
 * "the current high-resolution real time in nanoseconds".
 *
 * Assuming a process recorded the start time using `currentTimeInNanoseconds()` when passed to this helper it will
 * work out the time taken in nanoseconds, convert that to milliseconds and seconds and output it as a log message.
 *
 * @param {bigint} startTime - the time the process started in nanoseconds
 * @param {string} message - the message to log
 * @param {object} [data] - additional data to include with the log output
 *
 * @returns {object} the log data generated and logged
 */
function calculateAndLogTimeTaken (startTime, message, data = {}) {
  const endTime = currentTimeInNanoseconds()
  const timeTakenNs = endTime - startTime
  const timeTakenMs = timeTakenNs / 1000000n
  const timeTakenSs = timeTakenMs / 1000n

  const logData = {
    timeTakenMs,
    timeTakenSs,
    ...data
  }

  global.GlobalNotifier.omg(message, logData)

  return logData
}

/**
 * Returns the current time in nanoseconds. Used as part of logging how long something takes
 *
 * We often want to see how long a process takes and capture it in our logs. This can be especially useful when we
 * have a process that involves talking to an external one. By capturing the time it takes our process to complete
 * we can deal with any challenges about the performance of our process VS the total time taken.
 *
 * To do that you need to record the time when the process starts and the time when the process ends and then work out
 * the duration. Doing that with JavaScript time constructs though gets very messy and we want to avoid bringing in
 * 3rd party packages for just this one thing.
 *
 * Unfortunately, we cannot find the original source but a 'neat' way of doing it is to use
 * {@link https://nodejs.org/api/process.html#processhrtimebigint | process.hrtime.bigint()} which returns
 * "the current high-resolution real time in nanoseconds".
 *
 * Do the same at the end and take one from the other, and you then have the duration in nanoseconds which you can
 * easily convert into something more readable.
 *
 * @returns {bigint} the current time in nanoseconds
 */
function currentTimeInNanoseconds () {
  return process.hrtime.bigint()
}

/**
 * Generate a Universally Unique Identifier (UUID)
 *
 * The service uses these as the IDs for most records in the DB. Most tables will automatically generate them when
 * the record is created but not all do. There are also times when it is either more performant, simpler, or both for
 * us to generate the ID before inserting a new record. For example, we can pass the generated ID to child records to
 * set the foreign key relationship.
 *
 * NOTE: We set `disableEntropyCache` to `false` as normally, for performance reasons node caches enough random data to
 * generate up to 128 UUIDs. We disable this as we may need to generate more than this and the performance hit in
 * disabling this cache is a rounding error in comparison to the rest of the process.
 *
 * https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
 *
 * @returns {string} a randomly generated UUID
 */
function generateUUID () {
  return randomUUID({ disableEntropyCache: true })
}

module.exports = {
  calculateAndLogTimeTaken,
  currentTimeInNanoseconds,
  generateUUID
}
