'use strict'

/**
 * General helper methods
 * @module GeneralLib
 */

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

/**
 * Determine the start and end date for the current financial year
 *
 * We often need to work out what the start and end date for the current financial year is. But because the financial
 * year starts on 01-APR and finishes on 31-MAR what that year is will change dependent on the current date.
 *
 * @returns {object} An object containing a `startDate` and `endDate`
 */
function determineCurrentFinancialYear () {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  let startYear
  let endYear

  // IMPORTANT! getMonth returns an integer (0-11). So, January is represented as 0 and December as 11. This is why
  // we use 2 rather than 3 to refer to March
  if (currentDate.getMonth() <= 2) {
    // For example, if currentDate was 2022-02-15 it would fall in financial year 2021-04-01 to 2022-03-31
    startYear = currentYear - 1
    endYear = currentYear
  } else {
    // For example, if currentDate was 2022-06-15 it would fall in financial year 2022-04-01 to 2023-03-31
    startYear = currentYear
    endYear = currentYear + 1
  }

  return { startDate: new Date(startYear, 3, 1), endDate: new Date(endYear, 2, 31) }
}

/**
 * Formats a date into a human readable day, month, year and time string, for example, '12 September 2021 at 21:43:44'
 *
 * @param {Date} date - The date to be formatted
 *
 * @returns {string} The date formatted as a 'DD MMMM YYYY at HH:MM:SS' string
 */
function formatLongDateTime(date) {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
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

/**
 * Replaces 'null' with null
 *
 * Some of the data we load from NALD contains the string 'null' which is not the same as the null value. This function
 * takes a value and checks if it is a string equal to 'null', and if it is, it will return null instead of the string.
 *
 * @param {string} value - the value to check
 *
 * @returns {string|null} the null value if the string is 'null', otherwise the same value
 */
function naldNull (value) {
  return value === 'null' ? null : value
}

/**
 * Returns the current date and time as an ISO string
 *
 * We can't use Date.now() because Javascript returns the time since the epoch in milliseconds, whereas a PostgreSQL
 * timestamp field can only hold the seconds since the epoch. Pass it an ISO string though, for example
 * '2023-01-05T08:37:05.575Z', and PostgreSQL can do the conversion.
 *
 * Thanks to https://stackoverflow.com/a/61912776/6117745
 *
 * @returns {string} The date now as an ISO string, for example `'2023-01-13T18:29:51.682Z'`
 */
function timestampForPostgres () {
  return new Date().toISOString()
}

module.exports = {
  calculateAndLogTimeTaken,
  currentTimeInNanoseconds,
  determineCurrentFinancialYear,
  formatLongDateTime,
  generateUUID,
  naldNull,
  timestampForPostgres
}
