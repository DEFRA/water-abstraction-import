const moment = require('moment')
const DATE_FORMAT = 'YYYY-MM-DD'
const NALD_FORMAT = 'DD/MM/YYYY'
const NALD_TRANSFER_FORMAT = 'DD/MM/YYYY HH:mm:ss'

const mapNaldDate = str => {
  if (str === 'null') {
    return null
  }
  return moment(str, NALD_FORMAT).format(DATE_FORMAT)
}

const mapIsoDateToNald = str => {
  if (str === null) {
    return 'null'
  }
  return moment(str, DATE_FORMAT).format(NALD_FORMAT)
}

const getSortedDates = arr => {
  const moments = arr
    .map(str => moment(str, DATE_FORMAT))
    .filter(m => m.isValid())

  const sorted = moments.sort(function (startDate1, startDate2) {
    return startDate1 - startDate2
  })
  return sorted
}

const getMinDate = arr => {
  const sorted = getSortedDates(arr)
  return sorted.length === 0 ? null : sorted[0].format(DATE_FORMAT)
}

const getMaxDate = arr => {
  const sorted = getSortedDates(arr)
  return sorted.length === 0 ? null : sorted[sorted.length - 1].format(DATE_FORMAT)
}

const mapTransferDate = str =>
  moment(str, NALD_TRANSFER_FORMAT).format(DATE_FORMAT)

const getPreviousDay = str =>
  moment(str, DATE_FORMAT).subtract(1, 'day').format(DATE_FORMAT)

module.exports = {
  mapNaldDate,
  getMinDate,
  getMaxDate,
  mapTransferDate,
  getPreviousDay,
  mapIsoDateToNald
}
