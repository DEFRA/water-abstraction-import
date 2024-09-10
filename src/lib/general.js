'use strict'

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

module.exports = {
  calculateAndLogTimeTaken,
  currentTimeInNanoseconds
}
